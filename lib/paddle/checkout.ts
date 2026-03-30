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

/** From `/api/paddle/prices` — which API key shape the server uses (hint for token choice). */
export type PaddleKeyMode = "live" | "sandbox" | "unknown";

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
  // Production: prefer explicit live token so you can keep a sandbox value in NEXT_PUBLIC_PADDLE_CLIENT_TOKEN.
  return (
    process.env.NEXT_PUBLIC_PADDLE_LIVE_CLIENT_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim()
  );
}

/** One-shot listener: first checkout.error / failed / payment.error after open. */
const checkoutErrorSink: {
  current: ((event: PaddleEventData) => void) | null;
} = { current: null };

type CheckoutErrorContext = {
  checkoutEnv: PaddleCheckoutEnvironment;
  paddleKeyMode: PaddleKeyMode;
};

function jwtHintLines(ctx: CheckoutErrorContext): string[] {
  const { checkoutEnv, paddleKeyMode } = ctx;
  const lines: string[] = [];

  if (checkoutEnv === "production" && paddleKeyMode === "live") {
    lines.push(
      "Your server is using a LIVE Paddle API key. Set NEXT_PUBLIC_PADDLE_LIVE_CLIENT_TOKEN to your LIVE client-side token " +
        "(Paddle → Developer tools → Authentication), or put that live token in NEXT_PUBLIC_PADDLE_CLIENT_TOKEN. " +
        "If NEXT_PUBLIC_PADDLE_CLIENT_TOKEN still holds a sandbox token from testing, JWT will fail — set NEXT_PUBLIC_PADDLE_LIVE_CLIENT_TOKEN for production. " +
        "Redeploy Vercel after changing NEXT_PUBLIC_* variables."
    );
  } else if (checkoutEnv === "sandbox" || paddleKeyMode === "sandbox") {
    lines.push(
      "Your server is using SANDBOX. Use the sandbox client-side token in NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN " +
        "or NEXT_PUBLIC_PADDLE_CLIENT_TOKEN (Developer tools → Authentication, sandbox). Redeploy after changes."
    );
  } else if (paddleKeyMode === "unknown") {
    lines.push(
      "Could not tell live vs sandbox from your API key (expected `live_` or `sdbx_` in the key). " +
        "Fix PADDLE_API_KEY or set PADDLE_USE_SANDBOX=true on the server so catalog and checkout use the same mode."
    );
  } else {
    lines.push(
      "Use a client-side token from the same Paddle environment as your prices (live vs sandbox). " +
        "Never paste the server API key into NEXT_PUBLIC_* variables."
    );
  }

  return lines;
}

function formatUserFacingCheckoutError(event: CheckoutEventError, ctx: CheckoutErrorContext): string {
  const lines: string[] = [];
  if (event.detail?.trim()) lines.push(event.detail.trim());
  else lines.push("Paddle checkout failed.");
  if (event.code) lines.push(`Code: ${event.code}`);
  if (event.documentation_url) lines.push(event.documentation_url);

  const detailLower = event.detail?.toLowerCase() ?? "";
  if (detailLower.includes("jwt") || detailLower.includes("failed to retrieve")) {
    lines.push(...jwtHintLines(ctx));
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
  checkoutEnvironment?: PaddleCheckoutEnvironment,
  options?: { paddleKeyMode?: PaddleKeyMode }
): Promise<void> {
  const id = priceId.trim();
  if (!id) {
    throw new Error(
      "Missing Paddle price ID. Add NEXT_PUBLIC_PADDLE_PRICE_ID_PRO (or Teams) from Paddle → Catalog → Prices."
    );
  }

  const env = checkoutEnvironment ?? environmentFromPublicVars();
  const paddleKeyMode: PaddleKeyMode = options?.paddleKeyMode ?? "unknown";
  const errorCtx: CheckoutErrorContext = { checkoutEnv: env, paddleKeyMode };

  const token = clientTokenForEnvironment(env);
  if (!token) {
    throw new Error(
      env === "sandbox"
        ? "Sandbox checkout: set NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN (or your sandbox value in NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) from Paddle → Developer tools → Authentication. It must match sandbox price IDs from your server API key."
        : "Set NEXT_PUBLIC_PADDLE_LIVE_CLIENT_TOKEN or NEXT_PUBLIC_PADDLE_CLIENT_TOKEN to your LIVE client-side token (Developer tools → Authentication). Prefer LIVE_CLIENT_TOKEN if CLIENT_TOKEN is still a sandbox token from testing."
    );
  }

  const paddle = await getPaddleForCheckout(env);
  if (!paddle) {
    throw new Error("Paddle.js failed to load. Check the browser console and your client token.");
  }

  const origin = window.location.origin;

  checkoutErrorSink.current = (event) => {
    window.alert(formatUserFacingCheckoutError(event as CheckoutEventError, errorCtx));
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
