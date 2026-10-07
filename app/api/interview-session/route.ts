import { NextResponse } from "next/server";

import { getAuthedUser } from "@/lib/auth/current-user";
import { query } from "@/lib/db/server";
import { letterGrade } from "@/lib/report-build";
import {
  SESSION_REPORT_SELECT,
  averageScoreFromStored,
  mapSessionRecordToInterviewRow,
  type StoredQuestionScore,
} from "@/lib/sessions/interview-session";

export const dynamic = "force-dynamic";

/** Loads one session for the signed-in user (report / resume view). */
export async function GET(request: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }
    const rows = await query(
      `select ${SESSION_REPORT_SELECT} from sessions where session_id = $1 and user_id = $2::uuid`,
      [sessionId, user.id]
    );
    if (!rows[0]) return NextResponse.json({ session: null });
    return NextResponse.json({ session: mapSessionRecordToInterviewRow(rows[0]) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load session" },
      { status: 500 }
    );
  }
}

function isStoredScore(v: unknown): v is StoredQuestionScore {
  const s = v as StoredQuestionScore;
  return (
    !!s &&
    typeof s.id === "number" &&
    typeof s.score === "number" &&
    s.score >= 0 &&
    s.score <= 10 &&
    typeof s.category === "string" &&
    typeof s.feedback === "string"
  );
}

/** Saves per-question scores; the server derives overall score, grade and completion time. */
export async function PATCH(request: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json().catch(() => null)) as {
      session_id?: unknown;
      question_scores?: unknown;
      status?: unknown;
    } | null;
    const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId || !Array.isArray(body?.question_scores) || !body.question_scores.every(isStoredScore)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const scores = body.question_scores as StoredQuestionScore[];
    const completed = body?.status === "completed";
    const avg = averageScoreFromStored(scores);

    const rows = await query(
      `update sessions set
         question_scores = $3::jsonb,
         status = $4,
         overall_score = $5::numeric,
         grade = $6,
         completed_at = case when $4 = 'completed' then coalesce(completed_at, now()) else completed_at end,
         updated_at = now()
       where session_id = $1 and user_id = $2::uuid
       returning session_id`,
      [
        sessionId,
        user.id,
        JSON.stringify(scores),
        completed ? "completed" : "active",
        avg,
        avg == null ? null : letterGrade(avg),
      ]
    );
    if (!rows[0]) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save scores" },
      { status: 500 }
    );
  }
}
