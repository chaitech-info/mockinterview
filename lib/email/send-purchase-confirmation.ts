/**
 * Sends a purchase confirmation via Resend (https://resend.com).
 * Set RESEND_API_KEY and EMAIL_FROM in the environment; if missing, logs and skips.
 */

export async function sendPurchaseConfirmationEmail(opts: {
  to: string;
  creditsAdded: number;
  newBalance: number;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || "Mock Interview <onboarding@resend.dev>";
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set; skipping purchase confirmation email");
    return { ok: false, skipped: true, error: "RESEND_API_KEY not set" };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  const origin = site.replace(/\/$/, "") || "http://localhost:3000";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: `Purchase confirmed — ${opts.creditsAdded} interview credit(s) added`,
      html: `<p>Hi,</p>
<p>Thanks for your purchase. We added <strong>${opts.creditsAdded}</strong> interview credit(s) to your account.</p>
<p>Your current balance is <strong>${opts.newBalance}</strong> credit(s).</p>
<p><a href="${origin}/app/intake">Start a mock interview</a></p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[email] Resend error", res.status, text.slice(0, 500));
    return { ok: false, error: text.slice(0, 500) };
  }

  return { ok: true };
}
