import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST { "email": "user@example.com" } → { ok: true, exists: boolean }
 * Uses service role + auth_email_registered RPC. Call only from trusted UI; rate-limit in production.
 */
export async function POST(request: Request) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 503 });
  }

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

  const { data, error } = await admin.rpc("auth_email_registered", { p_email: email });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, exists: Boolean(data) });
}
