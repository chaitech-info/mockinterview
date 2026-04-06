import type { IntakeResponse } from "@/lib/session-store";
import { letterGrade } from "@/lib/report-build";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Live Supabase schema uses `public.sessions` (see project migrations vs. hosted DB). */
const SESSIONS_TABLE = "sessions" as const;

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
  /** Derived for UI: `completed_at` when set, else `created_at` */
  updated_at: string;
  completed_at?: string | null;
  overall_score?: number | null;
  grade?: string | null;
  hiring_likelihood?: string | null;
};

export async function upsertInterviewSessionFromIntake(params: {
  userId: string;
  jdText: string;
  intake: IntakeResponse;
}): Promise<{ error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(SESSIONS_TABLE).upsert(
      {
        session_id: params.intake.session_id,
        user_id: params.userId,
        jd_text: params.jdText,
        extracted_data: (params.intake.extracted ?? null) as Record<string, unknown> | null,
        questions: params.intake.questions,
        status: "active",
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
    const avg = averageScoreFromStored(params.questionScores);
    const patch: Record<string, unknown> = {
      status: params.status ?? "active",
      question_scores: params.questionScores,
    };
    if (avg != null) {
      patch.overall_score = avg;
      patch.grade = letterGrade(avg);
    }
    if (params.status === "completed") {
      patch.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from(SESSIONS_TABLE)
      .update(patch)
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

/** Columns on `public.sessions` used for the dashboard list (matches live DB without `question_scores`). */
export const SESSIONS_LIST_SELECT =
  "session_id,status,created_at,completed_at,jd_text,questions,overall_score" as const;

/** Full row fields needed to build the post-interview report. */
export const SESSION_REPORT_SELECT =
  "session_id,user_id,jd_text,extracted_data,questions,question_scores,status,created_at,completed_at,overall_score,grade,hiring_likelihood" as const;

export function mapSessionRecordToInterviewRow(raw: Record<string, unknown>): InterviewSessionRow {
  const extractedRaw = raw.extracted_data ?? raw.extracted;
  const extracted =
    extractedRaw !== null &&
    typeof extractedRaw === "object" &&
    !Array.isArray(extractedRaw)
      ? (extractedRaw as Record<string, unknown>)
      : null;

  const qs = raw.question_scores;
  const question_scores: StoredQuestionScore[] = Array.isArray(qs) ? (qs as StoredQuestionScore[]) : [];

  const created_at = String(raw.created_at ?? "");
  const completed_at = typeof raw.completed_at === "string" ? raw.completed_at : null;
  const updated_at = completed_at ?? created_at;

  return {
    session_id: String(raw.session_id ?? ""),
    user_id: String(raw.user_id ?? ""),
    jd_text: typeof raw.jd_text === "string" ? raw.jd_text : null,
    extracted,
    questions: raw.questions,
    question_scores,
    status: String(raw.status ?? ""),
    created_at,
    updated_at,
    completed_at,
    overall_score: typeof raw.overall_score === "number" ? raw.overall_score : null,
    grade: typeof raw.grade === "string" ? raw.grade : null,
    hiring_likelihood:
      typeof raw.hiring_likelihood === "string" ? raw.hiring_likelihood : null,
  };
}

/**
 * Maps PostgREST rows to dashboard summaries (shared by API route and optional client helpers).
 */
export function mapSessionRowsToSummaries(
  rows: readonly Record<string, unknown>[]
): InterviewSessionSummary[] {
  if (!rows.length) return [];

  return rows.map((row) => {
    const questions = row.questions;
    const qCount = Array.isArray(questions) ? questions.length : 0;
    const jd = typeof row.jd_text === "string" ? row.jd_text.trim() : "";
    const jd_preview =
      jd.length > 90 ? `${jd.slice(0, 90).trim()}…` : jd || null;

    const created = String(row.created_at ?? "");
    const completed =
      typeof row.completed_at === "string" && row.completed_at
        ? row.completed_at
        : null;
    const updatedAt = completed ?? created;

    const fromOverall =
      typeof row.overall_score === "number" && !Number.isNaN(row.overall_score)
        ? Math.round(row.overall_score * 10) / 10
        : null;

    return {
      session_id: String(row.session_id ?? ""),
      status: row.status === "completed" ? "completed" : "active",
      created_at: created,
      updated_at: updatedAt,
      jd_preview,
      question_count: qCount,
      avg_score: fromOverall,
    };
  });
}

/**
 * Lists the signed-in user's sessions from the browser Supabase client.
 * Prefer calling `GET /api/dashboard/sessions` from the UI to avoid cross-origin fetch issues.
 */
export async function listInterviewSessionsForUser(userId: string): Promise<{
  data: InterviewSessionSummary[];
  error: Error | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .select(SESSIONS_LIST_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return { data: [], error: new Error(error.message) };
    return {
      data: mapSessionRowsToSummaries((data ?? []) as Record<string, unknown>[]),
      error: null,
    };
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message === "Failed to fetch"
        ? "Could not reach Supabase (network or blocked request). Check VPN, firewall, and that the project URL is correct."
        : e instanceof Error
          ? e.message
          : "Failed to list sessions";
    return {
      data: [],
      error: new Error(msg),
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
      .from(SESSIONS_TABLE)
      .select(SESSION_REPORT_SELECT)
      .eq("session_id", params.sessionId)
      .eq("user_id", params.userId)
      .maybeSingle();
    if (error) return { data: null, error: new Error(error.message) };
    if (!data) return { data: null, error: null };

    const row = mapSessionRecordToInterviewRow(data as Record<string, unknown>);
    return { data: row, error: null };
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message === "Failed to fetch"
        ? "Could not reach Supabase (network or blocked request). Check VPN, firewall, and that the project URL is correct."
        : e instanceof Error
          ? e.message
          : "Supabase fetch failed";
    return {
      data: null,
      error: new Error(msg),
    };
  }
}
