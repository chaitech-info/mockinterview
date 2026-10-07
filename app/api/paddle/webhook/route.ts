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
import { isDbConfigured, query } from "@/lib/db/server";

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

  if (!isDbConfigured()) {
    console.error("[Paddle webhook] DATABASE_URL missing");
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

    try {
      const inserted = await query(
        "insert into paddle_processed_events (id) values ($1) on conflict (id) do nothing returning id",
        [dedupeId]
      );
      if (inserted.length === 0) {
        return NextResponse.json({ ok: true, deduped: true, id: dedupeId });
      }
    } catch (dedupeErr) {
      console.error("[Paddle webhook] dedupe insert failed", dedupeErr);
      return NextResponse.json(
        { ok: false, error: dedupeErr instanceof Error ? dedupeErr.message : "dedupe failed" },
        { status: 500 }
      );
    }

    const resolvedUserId = await resolvePaddleUserId(payload);
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

    try {
      await query("select grant_purchase_credits($1::uuid, $2::int, $3)", [
        resolved.userId,
        resolved.credits,
        resolved.plan,
      ]);
    } catch (grantErr) {
      console.error("[Paddle webhook] grant_purchase_credits failed", grantErr);
      await query("delete from paddle_processed_events where id = $1", [dedupeId]).catch(() => undefined);
      return NextResponse.json(
        { ok: false, error: grantErr instanceof Error ? grantErr.message : "grant failed" },
        { status: 500 }
      );
    }

    const [prof] = await query<{ interview_credits: number; email: string | null; auth_email: string | null }>(
      `select p.interview_credits, p.email, u.email as auth_email
         from profiles p left join neon_auth."user" u on u.id = p.id
        where p.id = $1::uuid`,
      [resolved.userId]
    );

    const toEmail = prof?.auth_email ?? prof?.email ?? null;
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

  const userId = await resolvePaddleUserId(payload);
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

  try {
    await query(
      `insert into user_entitlements (user_id, plan, updated_at) values ($1::uuid, $2, now())
       on conflict (user_id) do update set plan = excluded.plan, updated_at = now()`,
      [userId, resolved.plan]
    );
  } catch (error) {
    console.error("[Paddle webhook] user_entitlements upsert failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "upsert failed" },
      { status: 500 }
    );
  }

  if (resolved.plan !== "free") {
    await query("update profiles set has_purchased = true, updated_at = now() where id = $1::uuid", [userId]).catch(
      (e) => console.warn("[Paddle webhook] has_purchased update (subscription) failed", e)
    );
  }

  return NextResponse.json({
    ok: true,
    plan: resolved.plan,
    event_type: eventType,
  });
}
