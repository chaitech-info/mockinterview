import { NextResponse } from "next/server";

import { mapPaddleListPricesResponse } from "@/lib/paddle/catalog-map";

export const dynamic = "force-dynamic";

function paddleApiBase(): string {
  return process.env.PADDLE_USE_SANDBOX === "true"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

export async function GET() {
  const key = process.env.PADDLE_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ ok: false, items: [], message: "PADDLE_API_KEY not set" });
  }

  const base = paddleApiBase();
  const urls = [`${base}/prices?per_page=50&include=product`, `${base}/prices?per_page=50`];

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
      return NextResponse.json({ ok: true, items });
    } catch {
      return NextResponse.json({ ok: false, items: [], message: "Invalid JSON from Paddle" });
    }
  }

  return NextResponse.json({
    ok: false,
    items: [],
    message: lastBody.slice(0, 1200) || "Paddle API request failed",
  });
}
