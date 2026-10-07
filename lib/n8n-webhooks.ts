/**
 * Backend webhooks (Python on Modal): JD intake and interview answer scoring.
 * Set NEXT_PUBLIC_BACKEND_URL (no trailing slash). The legacy n8n variables still work as overrides.
 */

const DEFAULT_BACKEND_URL = "https://askarhuseynli96--mockinterview.modal.run";

function backendBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

export function getIntakeWebhookUrl(): string {
  return process.env.NEXT_PUBLIC_N8N_INTAKE_WEBHOOK_URL?.trim() || `${backendBase()}/webhook/intake`;
}

export function getAnswerWebhookUrl(): string {
  return process.env.NEXT_PUBLIC_N8N_ANSWER_WEBHOOK_URL?.trim() || `${backendBase()}/webhook/answer`;
}
