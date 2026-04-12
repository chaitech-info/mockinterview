import { NextResponse } from "next/server";

import { getEntitlementsForUser } from "@/lib/entitlements/resolve";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Atomically decrements profiles.interview_credits by 1 when the user starts a mock interview.
 */
export async function POST() {
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
    const { error: ensureErr } = await supabase.rpc("ensure_user_entitlements");
    if (ensureErr) {
      throw new Error(ensureErr.message);
    }

    const { data: consumed, error: rpcError } = await supabase.rpc("consume_interview_credit", {
      p_user_id: user.id,
    });

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    if (!consumed) {
      const ent = await getEntitlementsForUser(supabase, user.id);
      return NextResponse.json(
        {
          ok: false,
          error: "no_credits",
          message:
            "You have no interview credits left. Purchase a credit pack to start a new mock interview.",
          interviewCredits: ent.interviewCredits,
          plan: ent.plan,
        },
        { status: 403 }
      );
    }

    const ent = await getEntitlementsForUser(supabase, user.id);
    return NextResponse.json({
      ok: true,
      interviewCredits: ent.interviewCredits,
      plan: ent.plan,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to consume interview credit";
    const hint =
      message.includes("relation") && message.includes("does not exist")
        ? "Apply Supabase migrations (including profiles + interview_credits) in your Supabase project."
        : undefined;
    return NextResponse.json(
      { ok: false, error: message, ...(hint ? { hint } : {}) },
      { status: 503 }
    );
  }
}
