/**
 * n8n webhook URLs for JD intake and interview answer scoring.
 * Override with NEXT_PUBLIC_* in .env.local / Vercel (see .env.example).
 */

const DEFAULT_INTAKE_WEBHOOK_URL =
  "https://ni0n408t.rpcl.app/webhook/intake";

const DEFAULT_ANSWER_WEBHOOK_URL =
  "https://ni0n408t.rpcl.app/webhook/answer";

export function getIntakeWebhookUrl(): string {
  return process.env.NEXT_PUBLIC_N8N_INTAKE_WEBHOOK_URL?.trim() || DEFAULT_INTAKE_WEBHOOK_URL;
}

export function getAnswerWebhookUrl(): string {
  return process.env.NEXT_PUBLIC_N8N_ANSWER_WEBHOOK_URL?.trim() || DEFAULT_ANSWER_WEBHOOK_URL;
}
