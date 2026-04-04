import type { QuestionCategory } from "@/lib/mock-data";

import type { ReportQuestionRow, ReportSnapshot } from "@/lib/report-snapshot";

const CATEGORIES: QuestionCategory[] = [
  "Behavioral",
  "Technical",
  "Situational",
  "Culture-fit",
];

export function letterGrade(avg: number): string {
  if (avg >= 9.5) return "A+";
  if (avg >= 9.0) return "A";
  if (avg >= 8.5) return "A-";
  if (avg >= 8.0) return "B+";
  if (avg >= 7.5) return "B";
  if (avg >= 7.0) return "B-";
  if (avg >= 6.5) return "C+";
  if (avg >= 6.0) return "C";
  if (avg >= 5.5) return "C-";
  if (avg >= 5.0) return "D";
  return "F";
}

export function overallSubtext(avg: number): string {
  if (avg >= 8.5) return "Strong performance — keep refining details and metrics.";
  if (avg >= 7.0) return "Above average — solid answers with clear room to sharpen.";
  if (avg >= 5.5) return "Developing — focus on structure, examples, and technical depth.";
  return "Needs practice — rehearse frameworks and add concrete outcomes.";
}

export function averageScore(rows: ReportQuestionRow[]): number | null {
  const scored = rows.filter((r) => r.score != null) as (ReportQuestionRow & { score: number })[];
  if (!scored.length) return null;
  const sum = scored.reduce((a, r) => a + r.score, 0);
  return sum / scored.length;
}

export function metricsByCategory(rows: ReportQuestionRow[]): Record<QuestionCategory, number | null> {
  const out = {} as Record<QuestionCategory, number | null>;
  for (const c of CATEGORIES) {
    const inCat = rows.filter((r) => r.category === c && r.score != null) as (ReportQuestionRow & {
      score: number;
    })[];
    if (!inCat.length) {
      out[c] = null;
    } else {
      const sum = inCat.reduce((a, r) => a + r.score, 0);
      out[c] = sum / inCat.length;
    }
  }
  return out;
}

function uniqueNonEmpty(strings: (string | undefined)[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of strings) {
    const t = typeof s === "string" ? s.trim() : "";
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

export function strengthsFromRows(rows: ReportQuestionRow[]): string[] {
  const scored = rows.filter((r) => r.score != null);
  const fromStrength = uniqueNonEmpty(
    scored.map((r) => r.strength).filter(Boolean),
    3
  );
  if (fromStrength.length >= 3) return fromStrength.slice(0, 3);
  const fromFeedback = scored
    .map((r) => r.feedback)
    .filter((f) => f.trim().length > 0)
    .slice(0, 3 - fromStrength.length);
  return [...fromStrength, ...fromFeedback].slice(0, 3);
}

export function improvementsFromRows(rows: ReportQuestionRow[]): string[] {
  const scored = rows.filter((r) => r.score != null);
  return uniqueNonEmpty(
    scored.map((r) => r.improvement).filter(Boolean) as string[],
    3
  );
}

export function studyPlanFromSnapshot(snapshot: ReportSnapshot): string[] {
  const rows = snapshot.rows;
  const metrics = metricsByCategory(rows);
  let lowest: QuestionCategory | null = null;
  let lowestVal = Infinity;
  for (const c of CATEGORIES) {
    const v = metrics[c];
    if (v != null && v < lowestVal) {
      lowestVal = v;
      lowest = c;
    }
  }
  const plans: string[] = [];
  if (lowest && metrics[lowest] != null) {
    plans.push(
      `Focus one session on ${lowest} questions — your average here was ${metrics[lowest]!.toFixed(1)}/10.`
    );
  }
  const imps = improvementsFromRows(rows);
  if (imps[0]) plans.push(`Practice drill: ${imps[0]}`);
  if (imps[1]) plans.push(`Next drill: ${imps[1]}`);
  if (plans.length < 3) {
    plans.push("Schedule another mock interview this week to lock in improvements.");
  }
  return plans.slice(0, 3);
}

export function hasReportData(snapshot: ReportSnapshot | null): boolean {
  return Boolean(snapshot?.rows?.length);
}
