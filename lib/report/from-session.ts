import type { ApiQuestion } from "@/lib/session-store";
import type { QuestionCategory } from "@/lib/mock-data";
import type { StoredQuestionScore } from "@/lib/supabase/interview-session";

export type ReportViewModel = {
  grade: string;
  overallScore: number;
  subtext: string;
  metrics: Record<QuestionCategory, number | null>;
  strengths: string[];
  improvements: string[];
  studyPlan: string[];
  rows: { id: number; category: string; score: number | null; feedback: string }[];
};

function apiTypeToCategory(t: ApiQuestion["type"]): QuestionCategory {
  if (t === "culture") return "Culture-fit";
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return cap as QuestionCategory;
}

function gradeFromScore(avg: number): string {
  if (avg >= 9.2) return "A+";
  if (avg >= 8.7) return "A";
  if (avg >= 8.0) return "A-";
  if (avg >= 7.3) return "B+";
  if (avg >= 6.7) return "B";
  if (avg >= 6.0) return "B-";
  if (avg >= 5.0) return "C+";
  if (avg >= 4.0) return "C";
  return "C-";
}

function subtextFromScore(avg: number): string {
  if (avg >= 8.5) return "Strong performance — keep refining details and metrics.";
  if (avg >= 7) return "Above average — solid answers with clear room to sharpen depth.";
  if (avg >= 5.5) return "Developing — focus on structure, examples, and technical depth.";
  return "Keep practicing — prioritize clarity, frameworks, and concrete outcomes.";
}

function categoryAverage(cat: QuestionCategory, scores: StoredQuestionScore[]): number | null {
  const list = scores.filter((s) => s.category === cat).map((s) => s.score);
  if (!list.length) return null;
  return Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10;
}

export function buildReportViewModel(
  questions: ApiQuestion[],
  scores: StoredQuestionScore[]
): ReportViewModel | null {
  if (!questions.length) return null;

  const scoreById = new Map(scores.map((s) => [s.id, s]));

  const answered = scores.filter((s) => typeof s.score === "number");
  const overallScore =
    answered.length > 0 ? answered.reduce((a, s) => a + s.score, 0) / answered.length : 0;

  const metrics: Record<QuestionCategory, number | null> = {
    Behavioral: categoryAverage("Behavioral", scores),
    Technical: categoryAverage("Technical", scores),
    Situational: categoryAverage("Situational", scores),
    "Culture-fit": categoryAverage("Culture-fit", scores),
  };

  const strengths: string[] = [];
  const seenS = new Set<string>();
  for (const s of [...answered].sort((a, b) => b.score - a.score)) {
    const line =
      (s.strength?.trim() || s.feedback?.trim() || `Strong ${s.category} response (${s.score.toFixed(1)}/10).`) ??
      "";
    if (line && !seenS.has(line)) {
      seenS.add(line);
      strengths.push(line);
    }
    if (strengths.length >= 3) break;
  }

  const improvements: string[] = [];
  const seenI = new Set<string>();
  for (const s of [...answered].sort((a, b) => a.score - b.score)) {
    const line =
      (s.improvement?.trim() ||
        s.feedback?.trim() ||
        `Add depth to ${s.category.toLowerCase()} answers (scored ${s.score.toFixed(1)}/10).`) ??
      "";
    if (line && !seenI.has(line)) {
      seenI.add(line);
      improvements.push(line);
    }
    if (improvements.length >= 3) break;
  }

  const studyPlan: string[] = [];
  const tech = metrics.Technical;
  if (tech != null && tech > 0 && tech < 7) {
    studyPlan.push("Technical depth & metrics (2–3 focused sessions)");
  }
  const beh = metrics.Behavioral;
  if (beh != null && beh > 0 && beh < 7) {
    studyPlan.push("STAR stories with measurable outcomes (1–2 days)");
  }
  const sit = metrics.Situational;
  if (sit != null && sit > 0 && sit < 7) {
    studyPlan.push("Situational diagnosis & trade-offs (1 day)");
  }
  const cult = metrics["Culture-fit"];
  if (cult != null && cult > 0 && cult < 7) {
    studyPlan.push("Culture-fit: concrete examples and motivations (ongoing)");
  }
  if (!studyPlan.length) {
    studyPlan.push("Continue weekly mock interviews on weak categories");
    studyPlan.push("Record answers and trim filler words");
    studyPlan.push("Peer or AI review on one tough question per day");
  }
  const extras = [
    "Mix behavioral + technical prompts each session",
    "Time-box answers, then tighten with a second take",
    "Review one low-scoring feedback line before the next mock",
  ];
  for (const e of extras) {
    if (studyPlan.length >= 3) break;
    if (!studyPlan.includes(e)) studyPlan.push(e);
  }

  const rows = questions.map((q, idx) => {
    const cat = apiTypeToCategory(q.type);
    const s = scoreById.get(q.id);
    return {
      id: idx + 1,
      category: cat,
      score: s ? s.score : null,
      feedback: s?.feedback?.trim() || (s ? "—" : "Skipped or not submitted"),
    };
  });

  const strengthsOut =
    strengths.length > 0
      ? strengths.slice(0, 3)
      : ["Answer questions in the mock interview to generate strengths from coach feedback."];
  const improvementsOut =
    improvements.length > 0
      ? improvements.slice(0, 3)
      : ["Submit audio answers to see targeted improvement notes here."];

  return {
    grade: answered.length ? gradeFromScore(overallScore) : "—",
    overallScore: answered.length ? Math.round(overallScore * 10) / 10 : 0,
    subtext: answered.length ? subtextFromScore(overallScore) : "No scored answers yet — complete the mock interview to build your report.",
    metrics,
    strengths: strengthsOut,
    improvements: improvementsOut,
    studyPlan: studyPlan.slice(0, 3),
    rows,
  };
}
