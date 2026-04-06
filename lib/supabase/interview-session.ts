import type { IntakeResponse } from "@/lib/session-store";
import { getSupabaseClient } from "@/lib/supabase/client";

export type StoredQuestionScore = {
  id: number;
  category: string;
  score: number;
  feedback: string;
  strength?: string;
  improvement?: string;
};

export type InterviewSessionRow = {
  session_id: string;
  user_id: string;
  jd_text: string | null;
  extracted: Record<string, unknown> | null;
  questions: unknown;
  question_scores: StoredQuestionScore[];
  status: string;
  created_at: string;
  updated_at: string;
};

export async function upsertInterviewSessionFromIntake(params: {
  userId: string;
  jdText: string;
  intake: IntakeResponse;
}): Promise<{ error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("interview_sessions").upsert(
      {
        session_id: params.intake.session_id,
        user_id: params.userId,
        jd_text: params.jdText,
        extracted: (params.intake.extracted ?? null) as Record<string, unknown> | null,
        questions: params.intake.questions,
        question_scores: [],
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );
    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Supabase upsert failed") };
  }
}

export async function updateInterviewSessionScores(params: {
  userId: string;
  sessionId: string;
  questionScores: StoredQuestionScore[];
  status?: "active" | "completed";
}): Promise<{ error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("interview_sessions")
      .update({
        question_scores: params.questionScores,
        status: params.status ?? "active",
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", params.sessionId)
      .eq("user_id", params.userId);
    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Supabase update failed") };
  }
}

export async function fetchInterviewSessionBySessionId(params: {
  userId: string;
  sessionId: string;
}): Promise<{ data: InterviewSessionRow | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("interview_sessions")
      .select(
        "session_id,user_id,jd_text,extracted,questions,question_scores,status,created_at,updated_at"
      )
      .eq("session_id", params.sessionId)
      .eq("user_id", params.userId)
      .maybeSingle();
    if (error) return { data: null, error: new Error(error.message) };
    if (!data) return { data: null, error: null };
    const row = data as InterviewSessionRow;
    row.question_scores = Array.isArray(row.question_scores) ? row.question_scores : [];
    return { data: row, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error("Supabase fetch failed"),
    };
  }
}
