"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Stepper } from "@/components/Stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/firebase/client";
import { getIntakeWebhookUrl } from "@/lib/n8n-webhooks";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import type { IntakeResponse } from "@/lib/session-store";
import { clearActiveSession, saveActiveSession } from "@/lib/session-store";
import { upsertInterviewSessionFromIntake } from "@/lib/supabase/interview-session";
import {
  appFlowMainClassName,
  appFlowPrimaryButtonClass,
  appFlowSecondaryPillClass,
  appFlowSurfaceCard,
} from "@/lib/app-flow-ui";
import { cn } from "@/lib/utils";

const MIN_JD_CHAR_COUNT = 50;

type Phase = "input" | "analyzing" | "results" | "error";

const CREDITS_UPDATED_EVENT = "interviewCreditsUpdated";

export default function IntakePage() {
  const router = useRouter();
  const auth = useAuthSession();
  const [phase, setPhase] = React.useState<Phase>("input");

  const [jdText, setJdText] = React.useState("");

  const [loadingText, setLoadingText] = React.useState("Analyzing job description...");
  const [error, setError] = React.useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = React.useState(false);
  const [jdTooShortMessage, setJdTooShortMessage] = React.useState(false);
  const [result, setResult] = React.useState<IntakeResponse | null>(null);
  const [interviewCredits, setInterviewCredits] = React.useState<number | null>(null);
  const [startInterviewLoading, setStartInterviewLoading] = React.useState(false);
  const [startInterviewError, setStartInterviewError] = React.useState<string | null>(null);
  const timeouts = React.useRef<number[]>([]);

  React.useEffect(() => {
    if (auth.status !== "signed_in") return;

    let cancelled = false;
    void (async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const r = await fetch("/api/entitlements", { cache: "no-store" });
        const data = (await r.json()) as { ok?: boolean; interviewCredits?: number };
        if (!cancelled && data.ok && typeof data.interviewCredits === "number") {
          setInterviewCredits(data.interviewCredits);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  async function startMockInterview() {
    setStartInterviewError(null);
    setStartInterviewLoading(true);
    void track("intake_start_mock_interview");
    try {
      const res = await fetch("/api/interview/consume-credit", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        interviewCredits?: number;
        message?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setStartInterviewError(
          data.message ??
            (typeof data.error === "string" ? data.error : "Could not start the mock interview.")
        );
        if (typeof data.interviewCredits === "number") {
          setInterviewCredits(data.interviewCredits);
          window.dispatchEvent(
            new CustomEvent(CREDITS_UPDATED_EVENT, { detail: { credits: data.interviewCredits } })
          );
        }
        return;
      }

      if (typeof data.interviewCredits === "number") {
        setInterviewCredits(data.interviewCredits);
        window.dispatchEvent(
          new CustomEvent(CREDITS_UPDATED_EVENT, { detail: { credits: data.interviewCredits } })
        );
      }
      router.push("/app/interview");
    } catch {
      setStartInterviewError("Something went wrong. Please try again.");
    } finally {
      setStartInterviewLoading(false);
    }
  }

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
    if (jdText.trim().length < MIN_JD_CHAR_COUNT) {
      setJdTooShortMessage(true);
      return;
    }
    setJdTooShortMessage(false);
    clearTimers();
    setError(null);
    setQuotaExceeded(false);
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

    let user;
    try {
      user = await getCurrentUser();
    } catch {
      setError("Sign-in is not configured on this deployment (Supabase env missing).");
      setPhase("error");
      return;
    }
    if (!user) {
      void track("intake_requires_login");
      await signInWithGoogle("/app/intake");
      return;
    }

    try {
      clearActiveSession();
      const res = await fetch(getIntakeWebhookUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd_text: jdText,
          user_id: user.id,
          user_email: user.email ?? "",
        }),
      });

      if (!res.ok) throw new Error(`Intake failed (${res.status})`);

      const json = (await res.json()) as IntakeResponse;
      if (!json?.success || !json.session_id || !Array.isArray(json.questions)) {
        throw new Error("Unexpected intake response");
      }

      const regRes = await fetch("/api/intake/register-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      const regJson = (await regRes.json()) as {
        ok?: boolean;
        intake?: IntakeResponse;
        error?: string;
        message?: string;
        plan?: string;
        interviewCredits?: number;
      };

      if (!regRes.ok || !regJson.ok || !regJson.intake) {
        if (regRes.status === 403 && regJson.error === "quota_exceeded") {
          setQuotaExceeded(true);
          setError(
            regJson.message ??
              "You have no interview credits left. Purchase a credit pack to start a new mock interview."
          );
          void track("intake_quota_exceeded", { plan: regJson.plan });
          setPhase("error");
          return;
        }
        const hint =
          typeof regJson.error === "string"
            ? regJson.error
            : `Could not start session (${regRes.status})`;
        throw new Error(
          "hint" in regJson && typeof (regJson as { hint?: string }).hint === "string"
            ? `${hint}. ${(regJson as { hint: string }).hint}`
            : hint
        );
      }

      const intake = regJson.intake;
      if (typeof regJson.interviewCredits === "number") {
        setInterviewCredits(regJson.interviewCredits);
      }
      setResult(intake);
      saveActiveSession(intake);
      const { error: saveErr } = await upsertInterviewSessionFromIntake({
        userId: user.id,
        jdText: jdText.trim(),
        intake,
      });
      if (saveErr) {
        console.warn("[PrepAI] Could not save session to Supabase:", saveErr.message);
      }
      void track("intake_analysis_complete", { sessionId: intake.session_id, plan: regJson.plan });
      setPhase("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      void track("intake_analysis_error");
      setPhase("error");
    }
  }

  return (
    <div className={cn(appFlowMainClassName(true), "relative")}>
      <Stepper currentStep={1} />

      {interviewCredits !== null ? (
        <p className="mt-5 inline-flex items-center rounded-full border border-[#e4e2e2] bg-white/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
          Interviews left:{" "}
          <span className="ml-1.5 tabular-nums text-foreground">{interviewCredits}</span>
        </p>
      ) : null}

      <div className="mt-8">
        <Card className={appFlowSurfaceCard}>
          <CardHeader className="space-y-3 pb-2">
            <Badge
              variant="outline"
              className="w-fit rounded-full border-[#e4e2e2] bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Step 1
            </Badge>
            <CardTitle className="text-2xl font-semibold tracking-tight">Paste the job description</CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We&apos;ll extract the role, required skills, and generate up to 12 tailored questions.
                You can answer the first three in the mock interview; the rest appear in your session list
                as locked.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              {phase === "results" ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Analysis complete</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                    <div className="rounded-2xl border border-[#e4e2e2] bg-[#faf8f6]/80 p-4 backdrop-blur-sm">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Session
                      </div>
                      <div className="mt-1 break-all text-sm font-semibold">
                        {result?.session_id ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#e4e2e2] bg-[#faf8f6]/80 p-4 backdrop-blur-sm">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Questions
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {result?.total_questions ?? result?.questions?.length ?? 0}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#e4e2e2] bg-[#faf8f6]/80 p-4 backdrop-blur-sm">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </div>
                      <div className="mt-1 text-sm font-semibold">Ready</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {result?.questions?.length ?? 0} questions generated
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#e4e2e2] bg-white/60 p-4 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold">Questions by category</div>
                      <div className="flex flex-wrap gap-2">
                        {["behavioral", "technical", "situational", "culture"].map((t) => {
                          const count =
                            result?.questions?.filter((q) => q.type === t).length ?? 0;
                          return (
                            <Badge
                              key={t}
                              variant="outline"
                              className="rounded-full border-[#e4e2e2] bg-[#f4f1ee] font-medium text-foreground hover:bg-[#ebe4dc]"
                            >
                              {count} {t}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        className={appFlowPrimaryButtonClass}
                        disabled={
                          startInterviewLoading ||
                          (typeof interviewCredits === "number" && interviewCredits < 1)
                        }
                        onClick={() => void startMockInterview()}
                      >
                        {startInterviewLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Starting…
                          </>
                        ) : (
                          <>Start mock interview →</>
                        )}
                      </Button>
                      {startInterviewError ? (
                        <p className="text-sm text-red-600" role="alert">
                          {startInterviewError}
                        </p>
                      ) : null}
                      {typeof interviewCredits === "number" && interviewCredits < 1 ? (
                        <p className="text-sm text-muted-foreground">
                          No credits left.{" "}
                          <a className="font-medium text-foreground underline" href="/#pricing">
                            Buy credits
                          </a>
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      className={appFlowSecondaryPillClass}
                      onClick={() => {
                        clearTimers();
                        setPhase("input");
                        setJdText("");
                        setJdTooShortMessage(false);
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
                <div className="flex items-center gap-3 rounded-2xl border border-[#e4e2e2] bg-[#faf8f6]/90 p-4 text-sm text-muted-foreground backdrop-blur-sm">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground" />
                  <span className="font-medium text-foreground">{loadingText}</span>
                </div>
              ) : phase === "error" ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#e4e2e2] bg-white/70 p-4 text-sm backdrop-blur-sm">
                    <div className="font-semibold text-foreground">Something went wrong</div>
                    <div className="mt-1 text-muted-foreground">{error ?? "Unknown error"}</div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {quotaExceeded ? (
                      <Button asChild className={appFlowPrimaryButtonClass}>
                        <a href="/#pricing" onClick={() => void track("intake_click_pricing_quota")}>
                          View pricing
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      className={quotaExceeded ? appFlowSecondaryPillClass : appFlowPrimaryButtonClass}
                      onClick={() => void runAnalysisSequence()}
                      disabled={jdText.trim().length < MIN_JD_CHAR_COUNT}
                    >
                      Try again
                    </Button>
                    <Button
                      variant="outline"
                      className={appFlowSecondaryPillClass}
                      onClick={() => {
                        setPhase("input");
                        setError(null);
                        setQuotaExceeded(false);
                        setJdTooShortMessage(false);
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
                    onChange={(e) => {
                      const v = e.target.value;
                      setJdText(v);
                      if (v.trim().length >= MIN_JD_CHAR_COUNT) {
                        setJdTooShortMessage(false);
                      }
                    }}
                    className="min-h-[220px] rounded-2xl border-[#e4e2e2] bg-white/80 text-[15px] leading-relaxed shadow-sm backdrop-blur-sm focus-visible:ring-[#1a1615]/20"
                  />

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      We&apos;ll extract the role, required skills, and generate up to 12 tailored questions.
                      You can answer the first three in the mock interview; the rest appear in your session
                      list as locked.
                    </div>
                    {jdTooShortMessage ? (
                      <p className="text-sm text-red-600" role="alert">
                        Please enter at least {MIN_JD_CHAR_COUNT} characters in the job description
                        before analyzing.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div
                      className="inline-block"
                      onClick={() => {
                        if (jdText.trim().length < MIN_JD_CHAR_COUNT) {
                          setJdTooShortMessage(true);
                        }
                      }}
                    >
                      <Button
                        className={cn(
                          appFlowPrimaryButtonClass,
                          jdText.trim().length < MIN_JD_CHAR_COUNT && "pointer-events-none"
                        )}
                        onClick={() => void runAnalysisSequence()}
                        disabled={jdText.trim().length < MIN_JD_CHAR_COUNT}
                      >
                        Analyze job description →
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">Google sign-in when you run analysis.</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

