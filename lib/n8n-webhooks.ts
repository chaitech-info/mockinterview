/**
 * n8n webhook URLs for JD intake and interview answer scoring.
 * Override with NEXT_PUBLIC_* in .env.local / Vercel (see .env.example).
 */

const DEFAULT_INTAKE_WEBHOOK_URL =
  "https://n8n.srv851223.hstgr.cloud/webhook-test/intake";

const DEFAULT_ANSWER_WEBHOOK_URL =
  "https://n8n.srv851223.hstgr.cloud/webhook-test/answer";

export function getIntakeWebhookUrl(): string {
  return process.env.NEXT_PUBLIC_N8N_INTAKE_WEBHOOK_URL?.trim() || DEFAULT_INTAKE_WEBHOOK_URL;
}

export function getAnswerWebhookUrl(): string {
  return process.env.NEXT_PUBLIC_N8N_ANSWER_WEBHOOK_URL?.trim() || DEFAULT_ANSWER_WEBHOOK_URL;
}
