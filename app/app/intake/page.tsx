"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Stepper } from "@/components/Stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/firebase/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/supabase/auth";
import type { IntakeResponse } from "@/lib/session-store";
import { clearActiveSession, saveActiveSession } from "@/lib/session-store";

type Phase = "input" | "analyzing" | "results" | "error";

export default function IntakePage() {
  const [phase, setPhase] = React.useState<Phase>("input");

  const [jdText, setJdText] = React.useState("");

  const [loadingText, setLoadingText] = React.useState("Analyzing job description...");
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<IntakeResponse | null>(null);
  const timeouts = React.useRef<number[]>([]);

  React.useEffect(() => {
    return () => {
      timeouts.current.forEach((t) => window.clearTimeout(t));
      timeouts.current = [];
    };
  }, []);

  function clearTimers() {
    timeouts.current.forEach((t) => window.clearTimeout(t));
    timeouts.current = [];
  }

  async function runAnalysisSequence() {
    clearTimers();
    setError(null);
    setResult(null);
    setPhase("analyzing");
    setLoadingText("Analyzing job description...");
    void track("intake_analyze_jd", { hasText: Boolean(jdText.trim()) });

    timeouts.current.push(
      window.setTimeout(() => setLoadingText("Extracting required skills..."), 1000)
    );
    timeouts.current.push(
      window.setTimeout(() => setLoadingText("Generating your question bank..."), 2000)
    );

    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      void track("intake_requires_login");
      await signInWithGoogle("/app/intake");
      return;
    }

    try {
      clearActiveSession();
      const res = await fetch(
        "https://n8n.srv851223.hstgr.cloud/webhook-test/intake",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jd_text: jdText,
            user_id: user.id,
            user_email: user.email ?? "",
          }),
        }
      );

      if (!res.ok) throw new Error(`Intake failed (${res.status})`);

      const json = (await res.json()) as IntakeResponse;
      if (!json?.success || !json.session_id || !Array.isArray(json.questions)) {
        throw new Error("Unexpected intake response");
      }

      setResult(json);
      saveActiveSession(json);
      void track("intake_analysis_complete", { sessionId: json.session_id });
      setPhase("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      void track("intake_analysis_error");
      setPhase("error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        <Stepper currentStep={1} />

        <div className="mt-8">
          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl">Paste the job description</CardTitle>
              <div className="text-sm text-muted-foreground">
                We&apos;ll extract the role, required skills, and generate 12 tailored questions
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {phase === "results" ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Analysis complete</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-xs font-medium text-muted-foreground">Session</div>
                      <div className="mt-1 text-sm font-semibold">
                        {result?.session_id ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-xs font-medium text-muted-foreground">Questions</div>
                      <div className="mt-1 text-sm font-semibold">
                        {result?.total_questions ?? result?.questions?.length ?? 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-xs font-medium text-muted-foreground">Status</div>
                      <div className="mt-1 text-sm font-semibold">Ready</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {result?.questions?.length ?? 0} questions generated
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-medium">
                        Questions by category
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["behavioral", "technical", "situational", "culture"].map((t) => {
                          const count =
                            result?.questions?.filter((q) => q.type === t).length ?? 0;
                          return (
                            <Badge key={t} className="bg-muted text-foreground hover:bg-muted">
                              {count} {t}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button asChild size="lg">
                      <a
                        href="/app/interview"
                        onClick={() => void track("intake_start_mock_interview")}
                      >
                        Start mock interview →
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        clearTimers();
                        setPhase("input");
                        setJdText("");
                        setResult(null);
                        clearActiveSession();
                        void track("intake_start_over");
                      }}
                    >
                      Start over
                    </Button>
                  </div>
                </div>
              ) : phase === "analyzing" ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium text-foreground">{loadingText}</span>
                </div>
              ) : phase === "error" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm">
                    <div className="font-medium text-foreground">Something went wrong</div>
                    <div className="mt-1 text-muted-foreground">{error ?? "Unknown error"}</div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={() => void runAnalysisSequence()} disabled={!jdText.trim()}>
                      Try again
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPhase("input");
                        setError(null);
                      }}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    rows={10}
                    placeholder="Paste the full job description here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="min-h-[220px]"
                  />

                  <div className="text-sm text-muted-foreground">
                    We&apos;ll extract the role, required skills, and generate 12 tailored questions
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      size="lg"
                      onClick={() => void runAnalysisSequence()}
                      disabled={!jdText.trim()}
                    >
                      Analyze job description →
                    </Button>
                    <div className="text-sm text-muted-foreground">No signup required.</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

