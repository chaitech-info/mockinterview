import { NextResponse } from "next/server";

import { getEntitlementsForUser } from "@/lib/entitlements/resolve";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entitlements = await getEntitlementsForUser(supabase, user.id);
    return NextResponse.json({ ok: true, ...entitlements });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load entitlements";
    const hint =
      message.includes("relation") && message.includes("does not exist")
        ? "Apply the SQL migration in supabase/migrations/20260404120000_interview_plans.sql in your Supabase project."
        : undefined;
    return NextResponse.json(
      { ok: false, error: message, ...(hint ? { hint } : {}) },
      { status: 503 }
    );
  }
}
