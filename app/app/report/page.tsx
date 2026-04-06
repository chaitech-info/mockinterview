"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Loader2, RotateCcw } from "lucide-react";

import { ScoreCard } from "@/components/ScoreCard";
import { Stepper } from "@/components/Stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/firebase/client";
import type { QuestionCategory } from "@/lib/mock-data";
import { questionScoresMock, reportMock } from "@/lib/mock-data";
import {
  improvementsFromRows,
  letterGrade,
  metricsByCategory,
  overallSubtext,
  strengthsFromRows,
  studyPlanFromSnapshot,
} from "@/lib/report-build";
import { buildReportViewModel, type ReportViewModel } from "@/lib/report/from-session";
import { buildReportPdfModel, downloadReportPdf } from "@/lib/report/generate-report-pdf";
import type { ReportSnapshot } from "@/lib/report-snapshot";
import { loadReportSnapshot } from "@/lib/report-snapshot";
import type { ApiQuestion } from "@/lib/session-store";
import { loadActiveSession } from "@/lib/session-store";
import { fetchInterviewSessionBySessionId } from "@/lib/supabase/interview-session";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

const METRIC_ORDER: QuestionCategory[] = [
  "Behavioral",
  "Technical",
  "Situational",
  "Culture-fit",
];

function scoreTone(score: number) {
  if (score >= 8) return "bg-foreground text-background";
  if (score >= 5) return "bg-muted text-foreground";
  return "bg-muted/70 text-foreground";
}

function viewModelFromSnapshot(snapshot: ReportSnapshot): ReportViewModel {
  const rows = snapshot.rows;
  const scored = rows.filter((r): r is (typeof rows)[number] & { score: number } => r.score != null);
  const overallScore =
    scored.length > 0 ? scored.reduce((a, r) => a + r.score, 0) / scored.length : 0;
  const strengths = strengthsFromRows(rows);
  const improvements = improvementsFromRows(rows);
  return {
    grade: scored.length ? letterGrade(overallScore) : "—",
    overallScore: scored.length ? Math.round(overallScore * 10) / 10 : 0,
    subtext: scored.length ? overallSubtext(overallScore) : "No scored answers yet — complete the mock interview to build your report.",
    metrics: metricsByCategory(rows),
    strengths:
      strengths.length > 0
        ? strengths
        : ["Coach strength lines from your scored answers will appear here."],
    improvements:
      improvements.length > 0
        ? improvements
        : ["Coach improvement tips from your scored answers will appear here."],
    studyPlan: studyPlanFromSnapshot(snapshot),
    rows: rows.map((r) => ({
      id: r.order,
      category: r.category,
      score: r.score,
      feedback: r.skipped ? "" : r.feedback,
    })),
  };
}

function ReportPageInner() {
  const searchParams = useSearchParams();
  const [fallbackSessionId, setFallbackSessionId] = React.useState<string | null>(null);
  const [storageHydrated, setStorageHydrated] = React.useState(false);

  React.useEffect(() => {
    setFallbackSessionId(loadActiveSession()?.session_id ?? null);
    setStorageHydrated(true);
  }, []);

  const urlSessionId = searchParams.get("session_id")?.trim() || null;
  const sessionId = urlSessionId || (storageHydrated ? fallbackSessionId : null);

  const [phase, setPhase] = React.useState<
    "loading" | "ready" | "error" | "sign_in" | "no_session"
  >("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [useMock, setUseMock] = React.useState(false);
  const [vm, setVm] = React.useState<ReportViewModel | null>(null);
  const [fromSnapshot, setFromSnapshot] = React.useState(false);

  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!storageHydrated) return;

      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setUseMock(true);
          setVm(null);
          setFromSnapshot(false);
          setPhase("ready");
        }
        return;
      }

      if (!sessionId) {
        const snap = loadReportSnapshot();
        if (snap?.rows?.length) {
          if (!cancelled) {
            setUseMock(false);
            setFromSnapshot(true);
            setVm(viewModelFromSnapshot(snap));
            setPhase("ready");
          }
          return;
        }
        if (!cancelled) {
          setUseMock(false);
          setVm(null);
          setFromSnapshot(false);
          setPhase("no_session");
        }
        return;
      }

      if (!cancelled) {
        setUseMock(false);
        setFromSnapshot(false);
        setPhase("loading");
        setErrorMessage(null);
      }

      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setPhase("sign_in");
          return;
        }

        const { data, error } = await fetchInterviewSessionBySessionId({
          userId: user.id,
          sessionId,
        });
        if (cancelled) return;

        if (error) {
          setErrorMessage(error.message);
          setPhase("error");
          return;
        }
        if (!data) {
          setErrorMessage("No saved session found for this id.");
          setPhase("error");
          return;
        }

        const questions = Array.isArray(data.questions) ? (data.questions as ApiQuestion[]) : [];
        const scores = Array.isArray(data.question_scores) ? data.question_scores : [];
        const built = buildReportViewModel(questions, scores);
        if (!built) {
          setErrorMessage("Session has no questions.");
          setPhase("error");
          return;
        }
        if (!cancelled) {
          setVm(built);
          setPhase("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof Error ? e.message : "Failed to load report");
          setPhase("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, storageHydrated]);

  function handleDownloadPdf() {
    setDownloading(true);
    void track("report_download_pdf");
    try {
      const safe =
        sessionId?.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40) ?? "report";
      const rows = questionRows.map((row) => ({
        id: row.id,
        category: row.category,
        score: row.score ?? null,
        feedback: row.feedback ?? "",
      }));
      const model = buildReportPdfModel(display ?? null, rows, METRIC_ORDER);
      downloadReportPdf(model, `prepai-interview-report-${safe}.pdf`);
    } catch (e) {
      console.error(e);
      window.alert(
        e instanceof Error
          ? e.message
          : "Could not create the PDF. Try again, or use your browser’s print dialog."
      );
    } finally {
      setDownloading(false);
    }
  }

  if (!storageHydrated || phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
          <Stepper currentStep={3} />
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading report…
          </div>
        </div>
      </div>
    );
  }

  if (phase === "sign_in") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
          <Stepper currentStep={3} />
          <Card className="mt-8 border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Sign in to view your report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Your scored report is tied to your account.</p>
              <Button
                onClick={() =>
                  void signInWithGoogle(`/app/report?session_id=${encodeURIComponent(sessionId ?? "")}`)
                }
              >
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
          <Stepper currentStep={3} />
          <Card className="mt-8 border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Report unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{errorMessage}</p>
              <p className="text-xs">
                If you just finished an interview, confirm the{" "}
                <code className="rounded bg-muted px-1 py-0.5">interview_sessions</code> table exists
                in Supabase (see <code className="rounded bg-muted px-1 py-0.5">supabase/migrations</code>
                ) and intake saved your session.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/app/intake">Start from intake</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/app/interview">Mock interview</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "no_session") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
          <Stepper currentStep={3} />
          <Card className="mt-8 border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">No session to show</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Open the report from the end of a mock interview, or complete intake first so a{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">session_id</code> is saved.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/app/intake">Go to intake</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/app/interview">Mock interview</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const display = vm;
  const questionRows = display?.rows ?? questionScoresMock;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
        <Stepper currentStep={3} />

        {useMock && !display ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Demo mode: Supabase is not configured. Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_*</code> and add
            the <code className="rounded bg-muted px-1 py-0.5 text-xs">interview_sessions</code> table to
            load real reports.
          </p>
        ) : null}

        {fromSnapshot && display ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Showing the report saved in this browser from your last completed interview. Sign in and open
            from the interview flow to sync with your account.
          </p>
        ) : null}

        <div className="mt-8 space-y-8">
          <div className="w-full max-w-full space-y-8 rounded-xl border border-border bg-card p-5 shadow-md sm:p-6">
            <header className="border-b border-border pb-4">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Interview report</h2>
              <p className="mt-1 text-sm text-muted-foreground">{new Date().toLocaleString()}</p>
            </header>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Overall grade</div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-foreground text-background hover:bg-foreground">
                        {display?.grade ?? reportMock.grade}
                      </Badge>
                      <div className="text-2xl font-semibold tracking-tight">
                        {(display?.overallScore ?? reportMock.overallScore).toFixed(1)} / 10
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {display?.subtext ?? reportMock.subtext}
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {METRIC_ORDER.map((key) => (
                <ScoreCard
                  key={key}
                  label={key}
                  score={display ? display.metrics[key] : reportMock.metrics[key]}
                  className="min-w-0"
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Strengths</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(display?.strengths ?? reportMock.strengths).map((s) => (
                    <div key={s} className="min-w-0 rounded-xl border border-border bg-background p-4">
                      <div className="border-l-4 border-foreground pl-3 text-sm font-medium leading-relaxed break-words text-pretty">
                        {s}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Areas to improve</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(display?.improvements ?? reportMock.improvements).map((s) => (
                    <div key={s} className="min-w-0 rounded-xl border border-border bg-background p-4">
                      <div className="border-l-4 border-muted-foreground/40 pl-3 text-sm font-medium leading-relaxed break-words text-pretty">
                        {s}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Study plan</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {(display?.studyPlan ?? reportMock.studyPlan).map((s) => (
                    <li
                      key={s}
                      className="min-w-0 rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground break-words"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Question-by-question breakdown</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 overflow-x-auto sm:overflow-x-visible">
                <div className="w-full min-w-0 max-w-full">
                  <table className="w-full min-w-0 max-w-full table-fixed border-separate border-spacing-0 text-sm">
                    <colgroup>
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "57%" }} />
                    </colgroup>
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="border-b border-border pb-3 pr-2 text-xs font-semibold uppercase tracking-wide">
                          Q#
                        </th>
                        <th className="border-b border-border pb-3 pr-2 text-xs font-semibold uppercase tracking-wide">
                          Category
                        </th>
                        <th className="border-b border-border pb-3 pr-2 text-xs font-semibold uppercase tracking-wide">
                          Score
                        </th>
                        <th className="border-b border-border pb-3 pr-0 text-xs font-semibold uppercase tracking-wide">
                          Feedback
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {questionRows.map((row) => (
                        <tr key={`${row.id}-${row.category}`} className="align-top">
                          <td className="border-b border-border py-3 pr-2 font-medium tabular-nums">
                            {row.id}
                          </td>
                          <td className="border-b border-border py-3 pr-2 break-words text-foreground">
                            {row.category}
                          </td>
                          <td className="border-b border-border py-3 pr-2 whitespace-nowrap">
                            {row.score != null ? (
                              <Badge className={cn("shrink-0", scoreTone(row.score))}>
                                {row.score.toFixed(1)}/10
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Skipped</span>
                            )}
                          </td>
                          <td className="border-b border-border py-3 pl-0 pr-0 text-muted-foreground">
                            <div className="min-w-0 max-w-full leading-relaxed break-words [overflow-wrap:anywhere]">
                              {row.score == null
                                ? "No answer submitted for this question."
                                : row.feedback || "—"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-semibold">Ready to save this report?</div>
                <div className="text-sm text-muted-foreground">
                  Download a scored PDF and keep practicing.
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={handleDownloadPdf} disabled={downloading}>
                  <Download className="h-4 w-4" />
                  {downloading ? "Preparing PDF…" : "Download PDF report"}
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="/app/intake" onClick={() => void track("report_start_new_session")}>
                    <RotateCcw className="h-4 w-4" />
                    Start a new session
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
            <Stepper currentStep={3} />
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          </div>
        </div>
      }
    >
      <ReportPageInner />
    </Suspense>
  );
}
