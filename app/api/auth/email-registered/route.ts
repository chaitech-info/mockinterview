import { NextResponse } from "next/server";

import { query } from "@/lib/db/server";

export const runtime = "nodejs";

/**
 * POST { "email": "user@example.com" } → { ok: true, exists: boolean }
 * Call only from trusted UI; rate-limit in production (account enumeration risk).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const emailRaw = (body as { email?: unknown }).email;
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  try {
    const rows = await query(
      `select 1 from neon_auth."user" where lower(trim(email)) = lower(trim($1)) limit 1`,
      [email]
    );
    return NextResponse.json({ ok: true, exists: rows.length > 0 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Lookup failed" },
      { status: 500 }
    );
  }
}
