import { NextResponse } from "next/server";

import { getEntitlementsForUser } from "@/lib/entitlements/resolve";
import { maxQuestionsForPlan } from "@/lib/entitlements/plan";
import type { IntakeResponse } from "@/lib/session-store";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as Partial<IntakeResponse>;
  if (
    !payload?.success ||
    typeof payload.session_id !== "string" ||
    !Array.isArray(payload.questions) ||
    payload.questions.length === 0
  ) {
    return NextResponse.json(
      { ok: false, error: "Expected { success, session_id, questions[] } from intake." },
      { status: 400 }
    );
  }

  try {
    const ent = await getEntitlementsForUser(supabase, user.id);

    if (!ent.canStartNewInterview) {
      return NextResponse.json(
        {
          ok: false,
          error: "quota_exceeded",
          message:
            "You have no interview credits left. Purchase a credit pack to start a new mock interview.",
          plan: ent.plan,
          interviewCredits: ent.interviewCredits,
        },
        { status: 403 }
      );
    }

    const { data: consumed, error: rpcError } = await supabase.rpc("consume_interview_credit", {
      p_user_id: user.id,
    });

    if (rpcError) {
      throw new Error(rpcError.message);
    }
    if (consumed !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: "quota_exceeded",
          message:
            "You have no interview credits left. Purchase a credit pack to start a new mock interview.",
          plan: ent.plan,
          interviewCredits: 0,
        },
        { status: 403 }
      );
    }

    const cap = maxQuestionsForPlan(ent.plan);
    const questions =
      cap === null ? payload.questions : payload.questions.slice(0, cap);

    const { error: upsertError } = await supabase.from("interview_sessions").upsert(
      {
        session_id: payload.session_id,
        user_id: user.id,
        jd_text: null,
        extracted: (payload.extracted ?? null) as Record<string, unknown> | null,
        questions,
        question_scores: [],
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (upsertError) {
      const admin = createSupabaseAdmin();
      if (admin) {
        const { data: row } = await admin
          .from("user_entitlements")
          .select("interview_credits")
          .eq("user_id", user.id)
          .maybeSingle();
        const cur = typeof row?.interview_credits === "number" ? row.interview_credits : 0;
        await admin
          .from("user_entitlements")
          .update({
            interview_credits: cur + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }
      throw new Error(upsertError.message);
    }

    const response: IntakeResponse = {
      success: true,
      session_id: payload.session_id,
      extracted: payload.extracted,
      questions,
      total_questions: questions.length,
    };

    return NextResponse.json({
      ok: true,
      intake: response,
      plan: ent.plan,
      interviewCredits: ent.interviewCredits - 1,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to register session";
    const hint =
      message.includes("relation") && message.includes("does not exist")
        ? "Apply Supabase migrations in supabase/migrations/ (including interview_credits)."
        : undefined;
    return NextResponse.json(
      { ok: false, error: message, ...(hint ? { hint } : {}) },
      { status: 503 }
    );
  }
}
