"use client";

import {
  initializePaddle,
  CheckoutEventNames,
  type CheckoutEventError,
  type Paddle,
  type PaddleEventData,
} from "@paddle/paddle-js";

import { track } from "@/lib/firebase/client";

/** Must match the Paddle account + mode used to list `pri_…` IDs (sandbox vs live). */
export type PaddleCheckoutEnvironment = "sandbox" | "production";

function environmentFromPublicVars(): PaddleCheckoutEnvironment {
  return process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
}

/**
 * Client-side token for Paddle.js. Sandbox and live tokens differ; set both if you use both modes.
 */
function clientTokenForEnvironment(env: PaddleCheckoutEnvironment): string | undefined {
  if (env === "sandbox") {
    return (
      process.env.NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN?.trim() ||
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim()
    );
  }
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
}

/** One-shot listener: first checkout.error / failed / payment.error after open. */
const checkoutErrorSink: { current: ((event: PaddleEventData) => void) | null } = { current: null };

function formatUserFacingCheckoutError(event: CheckoutEventError): string {
  const lines: string[] = [];
  if (event.detail?.trim()) lines.push(event.detail.trim());
  else lines.push("Paddle checkout failed.");
  if (event.code) lines.push(`Code: ${event.code}`);
  if (event.documentation_url) lines.push(event.documentation_url);

  const detailLower = event.detail?.toLowerCase() ?? "";
  if (detailLower.includes("jwt") || detailLower.includes("failed to retrieve")) {
    lines.push(
      "“Failed to retrieve JWT” almost always means the client-side token does not match Paddle mode: " +
        "use a LIVE client token (Developer tools → Authentication) when your server uses a live API key (`live_` in the key), " +
        "or a SANDBOX token when using a sandbox key (`sdbx_`). Regenerate the token in Paddle if you are unsure. " +
        "Do not use the server API key as the client token."
    );
  }

  lines.push(
    "Also check: Paddle → Checkout → Checkout settings → Default payment link, and approve your website domain for live checkout."
  );

  return lines.join("\n\n");
}

function paddleCheckoutEventCallback(event: PaddleEventData) {
  const name = event?.name;
  if (
    name !== CheckoutEventNames.CHECKOUT_ERROR &&
    name !== CheckoutEventNames.CHECKOUT_FAILED &&
    name !== CheckoutEventNames.CHECKOUT_PAYMENT_ERROR
  ) {
    return;
  }

  const err = event as CheckoutEventError;
  console.error(`[Paddle] ${String(name)}`, {
    code: err.code,
    detail: err.detail,
    type: err.type,
    documentation_url: err.documentation_url,
  });

  const sink = checkoutErrorSink.current;
  checkoutErrorSink.current = null;
  if (sink) {
    void track("paddle_checkout_error", {
      source: "paddle.event",
      code: err.code,
      message: err.detail?.slice(0, 400),
    });
    sink(event);
  }
}

/**
 * Ensures Paddle Billing (v1) is configured for this sandbox/live mode before opening checkout.
 * Re-runs initialization when the environment changes so price IDs and tokens stay aligned.
 */
async function getPaddleForCheckout(env: PaddleCheckoutEnvironment): Promise<Paddle | undefined> {
  const token = clientTokenForEnvironment(env);
  if (!token) return undefined;

  return initializePaddle({
    version: "v1",
    environment: env,
    token,
    eventCallback: paddleCheckoutEventCallback,
  });
}

export async function openPaddleCheckout(
  priceId: string,
  checkoutEnvironment?: PaddleCheckoutEnvironment
): Promise<void> {
  const id = priceId.trim();
  if (!id) {
    throw new Error(
      "Missing Paddle price ID. Add NEXT_PUBLIC_PADDLE_PRICE_ID_PRO (or Teams) from Paddle → Catalog → Prices."
    );
  }

  const env = checkoutEnvironment ?? environmentFromPublicVars();
  const token = clientTokenForEnvironment(env);
  if (!token) {
    throw new Error(
      env === "sandbox"
        ? "Sandbox checkout: set NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN (or your sandbox value in NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) from Paddle → Developer tools → Authentication. It must match sandbox price IDs from your server API key."
        : "Set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN from Paddle → Developer tools → Authentication (live). It must match live price IDs from your server API key."
    );
  }

  const paddle = await getPaddleForCheckout(env);
  if (!paddle) {
    throw new Error("Paddle.js failed to load. Check the browser console and your client token.");
  }

  const origin = window.location.origin;

  checkoutErrorSink.current = (event) => {
    window.alert(formatUserFacingCheckoutError(event as CheckoutEventError));
  };
  window.setTimeout(() => {
    if (checkoutErrorSink.current) checkoutErrorSink.current = null;
  }, 300_000);

  // Ensure mode matches token + price IDs (avoids “Failed to retrieve JWT” when env was stale).
  paddle.Environment.set(env);

  paddle.Checkout.open({
    items: [{ priceId: id, quantity: 1 }],
    settings: {
      displayMode: "overlay",
      theme: "light",
      successUrl: `${origin}/app/intake?checkout=success`,
    },
  });
}
