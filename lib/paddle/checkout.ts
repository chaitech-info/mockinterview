"use client";

import {
  initializePaddle,
  CheckoutEventNames,
  type Paddle,
  type PaddleEventData,
} from "@paddle/paddle-js";

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

function logCheckoutErrors(event: PaddleEventData) {
  if (event?.name === CheckoutEventNames.CHECKOUT_ERROR) {
    console.error("[Paddle] checkout.error", event);
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
    eventCallback: logCheckoutErrors,
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

  paddle.Checkout.open({
    items: [{ priceId: id, quantity: 1 }],
    settings: {
      successUrl: `${origin}/app/intake?checkout=success`,
    },
  });
}
