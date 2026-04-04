import type { QuestionCategory } from "@/lib/mock-data";

export type ReportQuestionRow = {
  questionId: number;
  order: number;
  category: QuestionCategory;
  prompt: string;
  /** null if the user skipped without submitting */
  score: number | null;
  feedback: string;
  strength?: string;
  improvement?: string;
  skipped: boolean;
};

export type ReportSnapshot = {
  sessionId: string;
  completedAt: string;
  rows: ReportQuestionRow[];
};

export const REPORT_SNAPSHOT_KEY = "prepai_report_snapshot_v1";

export function saveReportSnapshot(data: ReportSnapshot) {
  try {
    window.sessionStorage.setItem(REPORT_SNAPSHOT_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function loadReportSnapshot(): ReportSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(REPORT_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReportSnapshot;
  } catch {
    return null;
  }
}

export function clearReportSnapshot() {
  try {
    window.sessionStorage.removeItem(REPORT_SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

export function buildReportSnapshotFromInterview(
  sessionId: string,
  questions: Array<{
    id: number;
    order: number;
    category: QuestionCategory;
    prompt: string;
  }>,
  scoreRows: Array<{
    id: number;
    category: QuestionCategory;
    score: number;
    feedback: string;
    strength?: string;
    improvement?: string;
  }>
): ReportSnapshot {
  const rows: ReportQuestionRow[] = questions.map((q) => {
    const row = scoreRows.find((r) => r.id === q.id);
    if (row) {
      return {
        questionId: q.id,
        order: q.order,
        category: q.category,
        prompt: q.prompt,
        score: row.score,
        feedback: row.feedback,
        strength: row.strength,
        improvement: row.improvement,
        skipped: false,
      };
    }
    return {
      questionId: q.id,
      order: q.order,
      category: q.category,
      prompt: q.prompt,
      score: null,
      feedback: "",
      skipped: true,
    };
  });

  return {
    sessionId,
    completedAt: new Date().toISOString(),
    rows,
  };
}
