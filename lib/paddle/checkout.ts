"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

function getEnvironment(): "production" | "sandbox" {
  return process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
}

/**
 * Lazy-init Paddle.js once per tab. Requires NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
 * (client-side token from Paddle → Developer tools → Authentication).
 */
export function getPaddle(): Promise<Paddle | undefined> {
  if (typeof window === "undefined") return Promise.resolve(undefined);
  if (paddlePromise) return paddlePromise;

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
  if (!token) {
    console.warn("[PrepAI] NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set; Paddle checkout disabled.");
    return Promise.resolve(undefined);
  }

  paddlePromise = initializePaddle({
    environment: getEnvironment(),
    token,
  });

  return paddlePromise;
}

export async function openPaddleCheckout(priceId: string): Promise<void> {
  const id = priceId.trim();
  if (!id) {
    throw new Error(
      "Missing Paddle price ID. Add NEXT_PUBLIC_PADDLE_PRICE_ID_PRO (or Teams) from Paddle → Catalog → Prices."
    );
  }

  const paddle = await getPaddle();
  if (!paddle) {
    throw new Error(
      "Paddle is not configured. Set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN and redeploy."
    );
  }

  const origin = window.location.origin;

  paddle.Checkout.open({
    items: [{ priceId: id, quantity: 1 }],
    settings: {
      successUrl: `${origin}/app/intake?checkout=success`,
    },
  });
}
