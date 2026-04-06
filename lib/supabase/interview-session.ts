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

export type InterviewSessionSummary = {
  session_id: string;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
  /** Short preview of stored job description, if any */
  jd_preview: string | null;
  question_count: number;
  /** Average score across answered questions, or null if none scored */
  avg_score: number | null;
};

function averageScoreFromStored(scores: StoredQuestionScore[]): number | null {
  const nums = scores.filter((s) => typeof s.score === "number");
  if (!nums.length) return null;
  const sum = nums.reduce((a, s) => a + s.score, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

/**
 * Lists the signed-in user's sessions, newest first (by `updated_at`).
 */
export async function listInterviewSessionsForUser(userId: string): Promise<{
  data: InterviewSessionSummary[];
  error: Error | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("interview_sessions")
      .select(
        "session_id,status,created_at,updated_at,jd_text,questions,question_scores"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) return { data: [], error: new Error(error.message) };
    if (!data?.length) return { data: [], error: null };

    const summaries: InterviewSessionSummary[] = data.map((row) => {
      const questions = row.questions;
      const qCount = Array.isArray(questions) ? questions.length : 0;
      const rawScores = row.question_scores;
      const scores: StoredQuestionScore[] = Array.isArray(rawScores) ? rawScores : [];
      const jd = typeof row.jd_text === "string" ? row.jd_text.trim() : "";
      const jd_preview =
        jd.length > 90 ? `${jd.slice(0, 90).trim()}…` : jd || null;

      return {
        session_id: row.session_id as string,
        status: row.status === "completed" ? "completed" : "active",
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        jd_preview,
        question_count: qCount,
        avg_score: averageScoreFromStored(scores),
      };
    });

    return { data: summaries, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error("Failed to list sessions"),
    };
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
