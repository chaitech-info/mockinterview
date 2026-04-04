import { NextResponse } from "next/server";

import { getEntitlementsForUser } from "@/lib/entitlements/resolve";
import { maxQuestionsForPlan } from "@/lib/entitlements/plan";
import type { IntakeResponse } from "@/lib/session-store";
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
            "You have used all mock interviews for this month on your current plan. Upgrade to continue.",
          plan: ent.plan,
          interviewsUsedThisMonth: ent.interviewsUsedThisMonth,
          interviewsAllowedThisMonth: ent.interviewsAllowedThisMonth,
        },
        { status: 403 }
      );
    }

    const cap = maxQuestionsForPlan(ent.plan);
    const questions =
      cap === null ? payload.questions : payload.questions.slice(0, cap);

    const { error: insertError } = await supabase.from("interview_sessions").insert({
      user_id: user.id,
      n8n_session_id: payload.session_id,
    });

    if (insertError) {
      throw new Error(insertError.message);
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
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to register session";
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
