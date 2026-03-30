import { NextResponse } from "next/server";

import { mapPaddleListPricesResponse } from "@/lib/paddle/catalog-map";

export const dynamic = "force-dynamic";

/** Prefer host implied by key so Vercel PADDLE_USE_SANDBOX cannot fight a live/sandbox key. */
function paddleApiBaseForKey(key: string): string {
  if (key.includes("sdbx_")) return "https://sandbox-api.paddle.com";
  if (key.includes("live_")) return "https://api.paddle.com";
  return process.env.PADDLE_USE_SANDBOX === "true"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

function friendlyPaddleError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string; detail?: string } };
    const code = parsed?.error?.code;
    if (code === "forbidden") {
      return (
        "Paddle returned forbidden (403): this API key is valid but not allowed to list prices. " +
        "In Paddle → Developer tools → API keys, edit the key and enable Price (Read) — " +
        "`price.read`. If you use product names from Paddle, also enable Product (Read) — `product.read`. " +
        "Sandbox keys must call the sandbox API (your key should contain sdbx_); live keys contain live_."
      );
    }
  } catch {
    /* use raw body */
  }
  return body.slice(0, 1200) || "Paddle API request failed";
}

function checkoutEnvironmentForBase(base: string): "sandbox" | "production" {
  return base.includes("sandbox") ? "sandbox" : "production";
}

/** Inferred from key shape (for checkout hints only; not a secret). */
function paddleKeyModeFromKey(key: string): "live" | "sandbox" | "unknown" {
  if (key.includes("live_")) return "live";
  if (key.includes("sdbx_")) return "sandbox";
  return "unknown";
}

export async function GET() {
  const key = process.env.PADDLE_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ ok: false, items: [], message: "PADDLE_API_KEY not set" });
  }

  const base = paddleApiBaseForKey(key);
  const checkoutEnvironment = checkoutEnvironmentForBase(base);
  const paddleKeyMode = paddleKeyModeFromKey(key);
  // List without `include` first: only `price.read`. `include=product` also needs `product.read`
  // (see https://developer.paddle.com/api-reference/about/permissions).
  const urls = [`${base}/prices?per_page=50`, `${base}/prices?per_page=50&include=product`];

  let lastBody = "";
  for (const url of urls) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    lastBody = await res.text();
    if (!res.ok) continue;

    try {
      const json = JSON.parse(lastBody) as unknown;
      const items = mapPaddleListPricesResponse(json);
      return NextResponse.json({ ok: true, items, checkoutEnvironment, paddleKeyMode });
    } catch {
      return NextResponse.json({
        ok: false,
        items: [],
        message: "Invalid JSON from Paddle",
        checkoutEnvironment,
        paddleKeyMode,
      });
    }
  }

  return NextResponse.json({
    ok: false,
    items: [],
    message: friendlyPaddleError(lastBody),
    checkoutEnvironment,
    paddleKeyMode,
  });
}
