import { NextResponse } from "next/server";

import {
  extractFirstPriceId,
  extractSupabaseUserId,
  resolvePlanFromSubscription,
} from "@/lib/paddle/subscription-webhook";
import {
  extractTransactionDedupeId,
  resolveCreditsFromTransaction,
} from "@/lib/paddle/transaction-webhook";
import { verifyPaddleWebhookSignature } from "@/lib/paddle/webhook-verify";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PaddleParsed = {
  event_id?: string;
  event_type?: string;
  data?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.error("[Paddle webhook] PADDLE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ ok: false, error: "Webhook secret not configured" }, { status: 503 });
  }

  if (!verifyPaddleWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  let parsed: PaddleParsed;
  try {
    parsed = JSON.parse(rawBody) as PaddleParsed;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = parsed.event_type ?? "";
  const data = parsed.data;

  if (!data || typeof data !== "object") {
    return NextResponse.json({ ok: true, ignored: true, reason: "no_data" });
  }

  const payload = data as Record<string, unknown>;

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    console.error("[Paddle webhook] SUPABASE_SERVICE_ROLE_KEY or URL missing");
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  if (eventType === "transaction.completed" || eventType.startsWith("transaction.")) {
    if (eventType !== "transaction.completed") {
      return NextResponse.json({ ok: true, ignored: true, event_type: eventType });
    }

    const dedupeId =
      typeof parsed.event_id === "string" && parsed.event_id.length > 0
        ? parsed.event_id
        : extractTransactionDedupeId(payload);
    if (!dedupeId) {
      console.warn("[Paddle webhook] No event_id or transaction id for idempotency");
      return NextResponse.json({ ok: true, skipped: true, reason: "no_dedupe_id" });
    }

    const { error: dedupeErr } = await supabase.from("paddle_processed_events").insert({ id: dedupeId });
    if (dedupeErr) {
      if (dedupeErr.code === "23505") {
        return NextResponse.json({ ok: true, deduped: true, id: dedupeId });
      }
      console.error("[Paddle webhook] dedupe insert failed", dedupeErr);
      return NextResponse.json({ ok: false, error: dedupeErr.message }, { status: 500 });
    }

    const resolved = resolveCreditsFromTransaction(payload);
    if (!resolved.ok) {
      console.warn("[Paddle webhook] Transaction credits skipped", { reason: resolved.reason });
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: resolved.reason,
      });
    }

    const { error: grantErr } = await supabase.rpc("grant_purchase_credits", {
      p_user_id: resolved.userId,
      p_delta: resolved.credits,
      p_plan: resolved.plan,
    });

    if (grantErr) {
      console.error("[Paddle webhook] grant_purchase_credits failed", grantErr);
      await supabase.from("paddle_processed_events").delete().eq("id", dedupeId);
      return NextResponse.json({ ok: false, error: grantErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      kind: "transaction",
      credits: resolved.credits,
      plan: resolved.plan,
      event_type: eventType,
    });
  }

  if (!eventType.startsWith("subscription.")) {
    return NextResponse.json({ ok: true, ignored: true, event_type: eventType });
  }

  const userId = extractSupabaseUserId(payload);
  if (!userId) {
    console.warn(
      "[Paddle webhook] Missing custom_data.supabase_user_id — ensure checkout passes customData (user signed in)."
    );
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no_supabase_user_id",
    });
  }

  const resolved = resolvePlanFromSubscription(payload, eventType);
  if (resolved.plan === null) {
    const priceId = extractFirstPriceId(payload);
    console.warn("[Paddle webhook] Could not map plan", {
      eventType,
      priceId,
      reason: resolved.reason,
    });
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: resolved.reason,
      price_id: priceId ?? undefined,
    });
  }

  const { error } = await supabase.from("user_entitlements").upsert(
    {
      user_id: userId,
      plan: resolved.plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[Paddle webhook] user_entitlements upsert failed", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    plan: resolved.plan,
    event_type: eventType,
  });
}
