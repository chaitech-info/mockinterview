import { NextResponse } from "next/server";

import {
  extractFirstPriceId,
  flattenPaddleTransactionEntity,
  resolvePlanFromSubscription,
} from "@/lib/paddle/subscription-webhook";
import { resolvePaddleUserId } from "@/lib/paddle/resolve-paddle-user";
import {
  extractTransactionDedupeId,
  resolveCreditsFromTransaction,
} from "@/lib/paddle/transaction-webhook";
import { verifyPaddleWebhookSignature } from "@/lib/paddle/webhook-verify";
import { sendPurchaseConfirmationEmail } from "@/lib/email/send-purchase-confirmation";
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

  const rawPayload = data as Record<string, unknown>;
  /** JSON:API-style `attributes` merged in for subscription + transaction entities. */
  const payload = flattenPaddleTransactionEntity(rawPayload);

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    console.error("[Paddle webhook] SUPABASE_SERVICE_ROLE_KEY or URL missing");
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  if (eventType.startsWith("transaction.")) {
    /** Grant credits on paid + completed so one-time purchases work if only `transaction.paid` is subscribed. */
    if (eventType !== "transaction.paid" && eventType !== "transaction.completed") {
      return NextResponse.json({ ok: true, ignored: true, event_type: eventType });
    }

    /** Prefer transaction id so `paid` + `completed` for the same checkout dedupe once (not per-event evt_ ids). */
    const dedupeId =
      extractTransactionDedupeId(payload) ??
      (typeof parsed.event_id === "string" && parsed.event_id.length > 0 ? parsed.event_id : null);
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

    const resolvedUserId = await resolvePaddleUserId(supabase, payload);
    const resolved = resolveCreditsFromTransaction(payload, resolvedUserId);
    if (!resolved.ok) {
      console.warn("[Paddle webhook] Transaction credits skipped", {
        reason: resolved.reason,
        priceId: extractFirstPriceId(payload),
        event_type: eventType,
      });
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

    const { error: purchasedErr } = await supabase
      .from("profiles")
      .update({ has_purchased: true, updated_at: new Date().toISOString() })
      .eq("id", resolved.userId);
    if (purchasedErr) {
      console.warn("[Paddle webhook] has_purchased update failed", purchasedErr);
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("interview_credits, email")
      .eq("id", resolved.userId)
      .maybeSingle();

    const { data: authUserData } = await supabase.auth.admin.getUserById(resolved.userId);
    const toEmail = authUserData.user?.email ?? prof?.email ?? null;
    const newBalance =
      typeof prof?.interview_credits === "number" ? prof.interview_credits : resolved.credits;
    if (toEmail) {
      void sendPurchaseConfirmationEmail({
        to: toEmail,
        creditsAdded: resolved.credits,
        newBalance,
      }).catch((e) => console.error("[Paddle webhook] purchase email failed", e));
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

  const userId = await resolvePaddleUserId(supabase, payload);
  if (!userId) {
    console.warn(
      "[Paddle webhook] Could not resolve user — pass customData.email (or legacy supabase_user_id) from checkout."
    );
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no_user_identifier",
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

  if (resolved.plan !== "free") {
    const { error: subPurchasedErr } = await supabase
      .from("profiles")
      .update({ has_purchased: true, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (subPurchasedErr) {
      console.warn("[Paddle webhook] has_purchased update (subscription) failed", subPurchasedErr);
    }
  }

  return NextResponse.json({
    ok: true,
    plan: resolved.plan,
    event_type: eventType,
  });
}
