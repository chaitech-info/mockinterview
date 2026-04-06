export type ApiQuestion = {
  id: number;
  type: "behavioral" | "technical" | "situational" | "culture";
  question: string;
  difficulty?: "easy" | "medium" | "hard";
  ideal_keywords?: string[];
};

import { clearReportSnapshot } from "@/lib/report-snapshot";

export type IntakeResponse = {
  success: boolean;
  session_id: string;
  extracted?: Record<string, unknown>;
  questions: ApiQuestion[];
  total_questions: number;
};

const KEY = "prepai_active_session_v1";

export function saveActiveSession(data: IntakeResponse) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function loadActiveSession(): IntakeResponse | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as IntakeResponse;
  } catch {
    return null;
  }
}

export function clearActiveSession() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  clearReportSnapshot();
}

