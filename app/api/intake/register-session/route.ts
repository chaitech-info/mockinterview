import { NextResponse } from "next/server";

import { FULL_INTERVIEW_QUESTIONS, LIMITED_INTERVIEW_QUESTIONS } from "@/lib/entitlements/plan";
import { getEntitlementsForUser } from "@/lib/entitlements/resolve";
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

    const fullBank = payload.questions.slice(0, FULL_INTERVIEW_QUESTIONS);
    const playableCount = Math.min(LIMITED_INTERVIEW_QUESTIONS, fullBank.length);

    const { error: upsertError } = await supabase.from("interview_sessions").upsert(
      {
        session_id: payload.session_id,
        user_id: user.id,
        jd_text: null,
        extracted: (payload.extracted ?? null) as Record<string, unknown> | null,
        questions: fullBank,
        playable_question_count: playableCount,
        question_scores: [],
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const response: IntakeResponse = {
      success: true,
      session_id: payload.session_id,
      extracted: payload.extracted,
      questions: fullBank,
      total_questions: playableCount,
      playable_question_count: playableCount,
    };

    return NextResponse.json({
      ok: true,
      intake: response,
      plan: ent.plan,
      interviewCredits: ent.interviewCredits,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to register session";
    const hint =
      message.includes("relation") && message.includes("does not exist")
        ? "Apply Supabase migrations in supabase/migrations/ (including profiles + interview_credits)."
        : undefined;
    return NextResponse.json(
      { ok: false, error: message, ...(hint ? { hint } : {}) },
      { status: 503 }
    );
  }
}
