import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies Paddle Billing `Paddle-Signature` header (HMAC-SHA256 over `ts:rawBody`).
 * @see https://developer.paddle.com/webhooks/signature-verification
 */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  paddleSignatureHeader: string | null,
  secret: string,
  options?: { maxAgeSeconds?: number }
): boolean {
  if (!paddleSignatureHeader?.trim() || !secret) return false;

  let ts = "";
  let h1 = "";
  for (const part of paddleSignatureHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "ts") ts = val;
    if (key === "h1") h1 = val;
  }
  if (!ts || !h1) return false;

  const tsNum = Number.parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;
  const maxAge = options?.maxAgeSeconds ?? 300;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > maxAge) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expectedHex = createHmac("sha256", secret).update(signedPayload).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(h1, "hex"));
  } catch {
    return false;
  }
}
