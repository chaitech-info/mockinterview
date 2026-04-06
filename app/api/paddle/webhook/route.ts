import { NextResponse } from "next/server";

import {
  extractFirstPriceId,
  extractSupabaseUserId,
  resolvePlanFromSubscription,
} from "@/lib/paddle/subscription-webhook";
import { verifyPaddleWebhookSignature } from "@/lib/paddle/webhook-verify";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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

  let parsed: { event_type?: string; data?: Record<string, unknown> };
  try {
    parsed = JSON.parse(rawBody) as typeof parsed;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = parsed.event_type ?? "";
  const data = parsed.data;

  if (!data || typeof data !== "object") {
    return NextResponse.json({ ok: true, ignored: true, reason: "no_data" });
  }

  const subscriptionPayload = data as Record<string, unknown>;

  if (!eventType.startsWith("subscription.")) {
    return NextResponse.json({ ok: true, ignored: true, event_type: eventType });
  }

  const userId = extractSupabaseUserId(subscriptionPayload);
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

  const resolved = resolvePlanFromSubscription(subscriptionPayload, eventType);
  if (resolved.plan === null) {
    const priceId = extractFirstPriceId(subscriptionPayload);
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

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    console.error("[Paddle webhook] SUPABASE_SERVICE_ROLE_KEY or URL missing");
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
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
