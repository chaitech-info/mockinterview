"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  Loader2,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/firebase/client";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { hasFullQuestionBankAccess } from "@/lib/entitlements/full-bank-access";
import { countUnansweredPlayable } from "@/lib/interview/playable-unanswered";
import type { InterviewSessionSummary } from "@/lib/supabase/interview-session";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import {
  appFlowPrimaryButtonClass,
  appFlowSecondaryPillClass,
  appFlowSurfaceCard,
  appFlowWideMainClassName,
} from "@/lib/app-flow-ui";
import { cn } from "@/lib/utils";

const dashboardMainClass = cn(
  appFlowWideMainClassName,
  "relative",
  "pt-10 sm:pt-12 md:pt-16",
  "pb-10 sm:pb-12 md:pb-16"
);

const tableActionClass =
  "h-9 rounded-full border border-[#e4e2e2] bg-[#f4f1ee] px-3.5 text-xs font-semibold shadow-sm transition-colors hover:bg-[#ebe4dc] sm:text-sm";

const tableActionPrimaryClass =
  "h-9 rounded-full bg-[#1a1615] px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#1a1615]/90 sm:text-sm";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function sessionShowContinue(
  s: InterviewSessionSummary,
  fullBankUnlocked: boolean
): boolean {
  return (
    s.status === "active" &&
    countUnansweredPlayable(s.questions, s.question_scores, fullBankUnlocked) > 0
  );
}

function SessionActionLinks({
  s,
  fullBankUnlocked,
  layout = "stack",
}: {
  s: InterviewSessionSummary;
  fullBankUnlocked: boolean;
  layout?: "stack" | "row";
}) {
  const showContinue = sessionShowContinue(s, fullBankUnlocked);
  const interviewHref = `/app/interview?session_id=${encodeURIComponent(s.session_id)}`;
  const reportHref = `/app/report?session_id=${encodeURIComponent(s.session_id)}`;

  return (
    <div
      className={cn(
        "flex gap-2",
        layout === "stack" ? "flex-col items-stretch sm:flex-row sm:items-center" : "flex-col items-end"
      )}
    >
      {showContinue ? (
        <Button
          asChild
          className={cn(
            layout === "row" ? tableActionPrimaryClass : appFlowPrimaryButtonClass,
            layout === "row" ? "w-auto" : "w-full sm:w-auto"
          )}
        >
          <Link
            href={interviewHref}
            onClick={() =>
              void track("dashboard_continue_interview", { sessionId: s.session_id })
            }
          >
            Continue interview
          </Link>
        </Button>
      ) : null}
      <Button
        asChild
        variant="outline"
        className={cn(
          layout === "row" ? tableActionClass : appFlowSecondaryPillClass,
          layout === "row" ? "w-auto" : "w-full sm:w-auto"
        )}
      >
        <Link
          href={reportHref}
          onClick={() => void track("dashboard_open_report", { sessionId: s.session_id })}
        >
          View report
        </Link>
      </Button>
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-3xl border border-[#e4e2e2] bg-[#faf8f6]/70 p-5 shadow-[0_8px_40px_-16px_rgba(26,22,21,0.06)]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-4 w-28 rounded-full bg-[#e4e2e2]/90" />
              <div className="h-3 w-full max-w-md rounded-full bg-[#e4e2e2]/70" />
              <div className="h-3 w-4/5 max-w-sm rounded-full bg-[#e4e2e2]/50" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 rounded-full bg-[#e4e2e2]/80" />
              <div className="h-9 w-28 rounded-full bg-[#e4e2e2]/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const auth = useAuthSession();
  const [sessions, setSessions] = React.useState<InterviewSessionSummary[]>([]);
  /** False until the first list fetch finishes for the current `userId` (avoids a one-frame "ready" with no data). */
  const [sessionsListReady, setSessionsListReady] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fullBankUnlocked, setFullBankUnlocked] = React.useState(false);

  const userId = auth.status === "signed_in" ? auth.user.id : null;

  React.useEffect(() => {
    void track("dashboard_view");
  }, []);

  React.useEffect(() => {
    if (!userId) {
      setFullBankUnlocked(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/entitlements", { credentials: "include" });
        const data = (await r.json()) as {
          ok?: boolean;
          hasPurchased?: boolean;
          maxQuestionsPerInterview?: number | null;
        };
        if (!cancelled && data.ok && hasFullQuestionBankAccess(data)) setFullBankUnlocked(true);
        else if (!cancelled) setFullBankUnlocked(false);
      } catch {
        if (!cancelled) setFullBankUnlocked(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    if (!userId) {
      setSessions([]);
      setErrorMessage(null);
      setSessionsListReady(false);
      return;
    }

    let cancelled = false;
    setSessionsListReady(false);
    setErrorMessage(null);

    void (async () => {
      try {
        const res = await fetch("/api/dashboard/sessions", {
          credentials: "include",
        });
        const body = (await res.json().catch(() => null)) as
          | { sessions?: InterviewSessionSummary[]; error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setErrorMessage(
            typeof body?.error === "string"
              ? body.error
              : `Could not load sessions (HTTP ${res.status}).`
          );
          setSessionsListReady(true);
          return;
        }
        setSessions(Array.isArray(body?.sessions) ? body.sessions : []);
        setSessionsListReady(true);
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(
          e instanceof TypeError && e.message === "Failed to fetch"
            ? "Network error loading the dashboard. Try again or check your connection."
            : e instanceof Error
              ? e.message
              : "Could not load sessions."
        );
        setSessionsListReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const phase = (() => {
    if (auth.status === "loading") return "loading" as const;
    if (auth.status === "unconfigured") return "error" as const;
    if (auth.status === "signed_out") return "sign_in" as const;
    if (!sessionsListReady) return "loading" as const;
    if (errorMessage) return "error" as const;
    return "ready" as const;
  })();

  const configError =
    auth.status === "unconfigured"
      ? "Supabase is not configured on this deployment."
      : errorMessage;

  const showNewInterviewCta = auth.status === "signed_in" && phase !== "sign_in";
  const newInterviewLabel =
    phase === "ready" && sessions.length === 0 ? "Start first interview" : "New interview";

  return (
    <div className="relative">
      <main className={dashboardMainClass}>
        <div
          className={cn(
            appFlowSurfaceCard,
            "mb-8 overflow-hidden border-[#e4e2e2] bg-gradient-to-br from-white/95 to-[#faf8f6]/90 p-5 sm:p-6"
          )}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e4e2e2] bg-white/90 shadow-sm backdrop-blur-sm">
                <LayoutDashboard className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Your interviews
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Pick up an in-progress mock interview or open a report to see scores and feedback.
                </p>
              </div>
            </div>
            {showNewInterviewCta ? (
              <Button asChild className={cn(appFlowPrimaryButtonClass, "shrink-0 shadow-md")}>
                <Link
                  href="/app/intake"
                  onClick={() =>
                    void track(
                      phase === "ready" && sessions.length === 0
                        ? "dashboard_click_new_interview_empty"
                        : "dashboard_click_new_interview"
                    )
                  }
                >
                  <Sparkles className="mr-2 h-4 w-4 opacity-90" />
                  {newInterviewLabel}
                </Link>
              </Button>
            ) : null}
          </div>
          {phase === "ready" && sessions.length > 0 ? (
            <p className="mt-4 border-t border-[#e4e2e2]/80 pt-4 text-xs font-medium text-muted-foreground">
              {sessions.length} saved session{sessions.length === 1 ? "" : "s"} · newest first
            </p>
          ) : null}
        </div>

        {phase === "loading" ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Loading your interviews…
            </p>
            <DashboardLoadingSkeleton />
          </div>
        ) : null}

        {phase === "sign_in" ? (
          <Card className={cn(appFlowSurfaceCard, "max-w-lg border-[#e4e2e2]")}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight">
                Sign in to view your dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>Your interview history stays with your account.</p>
              <Button
                className={appFlowPrimaryButtonClass}
                onClick={() => void signInWithGoogle("/app/dashboard")}
              >
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {phase === "error" ? (
          <Card className={cn(appFlowSurfaceCard, "max-w-lg border-[#e4e2e2]")}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight">
                Couldn&apos;t load dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>{configError}</p>
              <Button asChild variant="outline" className={appFlowSecondaryPillClass}>
                <Link href="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {phase === "ready" ? (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <Card
                className={cn(
                  appFlowSurfaceCard,
                  "overflow-hidden border-[#e4e2e2] bg-gradient-to-b from-white/95 to-[#faf8f6]/80"
                )}
              >
                <CardContent className="flex flex-col items-center gap-5 px-6 py-14 text-center sm:py-16">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e4e2e2] bg-white/90 shadow-sm">
                    <ClipboardList className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div className="max-w-md space-y-2">
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                      No interviews yet
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Add a job description and we&apos;ll generate tailored questions. Your sessions will
                      show up here so you can continue or review reports anytime.
                    </p>
                  </div>
                  <Button asChild className={appFlowPrimaryButtonClass}>
                    <Link href="/app/intake" onClick={() => void track("dashboard_empty_start_intake")}>
                      Start from job description
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {sessions.map((s) => (
                    <Card
                      key={s.session_id}
                      className={cn(appFlowSurfaceCard, "overflow-hidden border-[#e4e2e2]")}
                    >
                      <CardContent className="space-y-4 p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge
                            variant={s.status === "completed" ? "default" : "outline"}
                            className={
                              s.status === "completed"
                                ? "rounded-full border-transparent bg-foreground px-2.5 text-background"
                                : "rounded-full border-[#e4e2e2] bg-white/80 text-muted-foreground"
                            }
                          >
                            {s.status === "completed" ? "Completed" : "In progress"}
                          </Badge>
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            {formatWhen(s.updated_at)}
                          </span>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Job description
                          </p>
                          <p
                            className="mt-1 line-clamp-3 text-sm font-medium leading-snug text-foreground [overflow-wrap:anywhere]"
                            title={s.jd_preview ?? undefined}
                          >
                            {s.jd_preview ?? "No preview saved"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-4 border-t border-[#e4e2e2]/80 pt-3 text-xs text-muted-foreground">
                          <span>
                            <span className="font-semibold text-foreground">{s.question_count}</span>{" "}
                            questions
                          </span>
                          <span>
                            Avg score:{" "}
                            <span className="font-semibold tabular-nums text-foreground">
                              {s.avg_score != null ? `${s.avg_score.toFixed(1)} / 10` : "—"}
                            </span>
                          </span>
                        </div>
                        <SessionActionLinks s={s} fullBankUnlocked={fullBankUnlocked} layout="stack" />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div
                  className={cn(
                    "hidden overflow-hidden rounded-3xl border border-[#e4e2e2] bg-card/90 shadow-[0_8px_40px_-16px_rgba(26,22,21,0.08)] backdrop-blur-sm lg:block"
                  )}
                >
                  <div className="w-full min-w-0 overflow-x-auto">
                    <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[#e4e2e2] bg-[#faf8f6]/90 text-left">
                          <th className="w-[13%] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Updated
                          </th>
                          <th className="w-[10%] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Status
                          </th>
                          <th className="w-[8%] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Questions
                          </th>
                          <th className="w-[10%] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Avg score
                          </th>
                          <th className="min-w-0 w-[44%] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Job (preview)
                          </th>
                          <th className="w-[15%] px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((s) => (
                          <tr
                            key={s.session_id}
                            className="border-b border-[#e4e2e2]/80 transition-colors last:border-0 hover:bg-[#faf8f6]/50"
                          >
                            <td className="px-4 py-3.5 align-top text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                <span className="leading-snug">{formatWhen(s.updated_at)}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3.5 align-top">
                              <Badge
                                variant={s.status === "completed" ? "default" : "outline"}
                                className={
                                  s.status === "completed"
                                    ? "rounded-full border-transparent bg-foreground text-background"
                                    : "rounded-full border-[#e4e2e2] bg-white/80 text-muted-foreground"
                                }
                              >
                                {s.status === "completed" ? "Completed" : "Active"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 align-top tabular-nums text-foreground">
                              {s.question_count}
                            </td>
                            <td className="px-4 py-3.5 align-top tabular-nums text-foreground">
                              {s.avg_score != null ? `${s.avg_score.toFixed(1)} / 10` : "—"}
                            </td>
                            <td className="min-w-0 px-4 py-3.5 align-top text-muted-foreground">
                              <span
                                className="line-clamp-3 block max-w-full [overflow-wrap:anywhere] break-words leading-relaxed"
                                title={s.jd_preview ?? undefined}
                              >
                                {s.jd_preview ?? "—"}
                              </span>
                            </td>
                            <td className="min-w-0 px-4 py-3.5 align-top text-right">
                              <SessionActionLinks s={s} fullBankUnlocked={fullBankUnlocked} layout="row" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
