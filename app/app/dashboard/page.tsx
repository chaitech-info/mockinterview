"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Calendar, ClipboardList, Loader2, LayoutDashboard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/firebase/client";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { listInterviewSessionsForUser, type InterviewSessionSummary } from "@/lib/supabase/interview-session";

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

export default function DashboardPage() {
  const [phase, setPhase] = React.useState<"loading" | "sign_in" | "ready" | "error">("loading");
  const [sessions, setSessions] = React.useState<InterviewSessionSummary[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    void track("dashboard_view");
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isSupabaseConfigured()) {
        setPhase("error");
        setErrorMessage("Supabase is not configured on this deployment.");
        return;
      }

      let supabase: ReturnType<typeof getSupabaseClient>;
      try {
        supabase = getSupabaseClient();
      } catch (e) {
        if (!cancelled) {
          setPhase("error");
          setErrorMessage(e instanceof Error ? e.message : "Could not connect.");
        }
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setPhase("sign_in");
        return;
      }

      const { data, error } = await listInterviewSessionsForUser(user.id);
      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message);
        setPhase("error");
        return;
      }
      setSessions(data);
      setPhase("ready");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
              <LayoutDashboard className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your interviews</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sessions saved from intake and mock interviews. Open a report to review scores.
              </p>
            </div>
          </div>
        </div>

        {phase === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your interviews…
          </div>
        ) : null}

        {phase === "sign_in" ? (
          <Card className="max-w-lg border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Sign in to view your dashboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Your interview history is stored with your account.</p>
              <Button onClick={() => void signInWithGoogle("/app/dashboard")}>Sign in with Google</Button>
            </CardContent>
          </Card>
        ) : null}

        {phase === "error" ? (
          <Card className="max-w-lg border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Couldn’t load dashboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{errorMessage}</p>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {phase === "ready" ? (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground/60" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">No interviews yet</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Paste a job description to generate questions and start a mock interview.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/app/intake">
                      Start from job description <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Updated</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Questions</th>
                        <th className="px-4 py-3 font-medium">Avg score</th>
                        <th className="min-w-[200px] px-4 py-3 font-medium">Job (preview)</th>
                        <th className="px-4 py-3 font-medium text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.session_id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="whitespace-nowrap px-4 py-3 align-top text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              {formatWhen(s.updated_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Badge
                              variant={s.status === "completed" ? "default" : "outline"}
                              className={
                                s.status === "completed"
                                  ? "border-transparent bg-foreground text-background"
                                  : "text-muted-foreground"
                              }
                            >
                              {s.status === "completed" ? "Completed" : "Active"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 align-top tabular-nums">{s.question_count}</td>
                          <td className="px-4 py-3 align-top tabular-nums">
                            {s.avg_score != null ? `${s.avg_score.toFixed(1)} / 10` : "—"}
                          </td>
                          <td className="max-w-[280px] px-4 py-3 align-top text-muted-foreground">
                            <span className="line-clamp-2 break-words" title={s.jd_preview ?? undefined}>
                              {s.jd_preview ?? "—"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-top text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link
                                href={`/app/report?session_id=${encodeURIComponent(s.session_id)}`}
                                onClick={() =>
                                  void track("dashboard_open_report", { sessionId: s.session_id })
                                }
                              >
                                View report
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
