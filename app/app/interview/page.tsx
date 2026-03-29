"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Lock, Mic, SkipForward } from "lucide-react";

import { QuestionCard } from "@/components/QuestionCard";
import { Stepper } from "@/components/Stepper";
import { Waveform } from "@/components/Waveform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { track } from "@/lib/firebase/client";
import type { AnswerWebhookResponse } from "@/lib/interview/answer-api";
import { extractExampleAnswerFromPayload, submitAnswerMultipart } from "@/lib/interview/answer-api";
import { extensionForMime, pickAudioMimeType } from "@/lib/interview/recording";
import { loadActiveSession } from "@/lib/session-store";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/supabase/auth";

type Phase = "idle" | "recording" | "thinking" | "feedback";

type UiQuestion = {
  id: number;
  order: number;
  category: "Behavioral" | "Technical" | "Situational" | "Culture-fit";
  prompt: string;
};

type ScoreRow = {
  id: number;
  category: UiQuestion["category"];
  score: number;
  feedback: string;
};

function mapApiToUiQuestions(
  questions: NonNullable<ReturnType<typeof loadActiveSession>>["questions"]
): UiQuestion[] {
  return questions.map((q, index) => ({
    id: q.id,
    order: index + 1,
    category:
      q.type === "culture"
        ? "Culture-fit"
        : ((q.type.charAt(0).toUpperCase() + q.type.slice(1)) as
            | "Behavioral"
            | "Technical"
            | "Situational"),
    prompt: q.question,
  }));
}

function scoreTone(score: number) {
  if (score >= 8) return "bg-foreground text-background";
  if (score >= 5) return "bg-muted text-foreground";
  return "bg-muted/70 text-foreground";
}

export default function InterviewPage() {
  const [requiresLogin, setRequiresLogin] = React.useState(false);
  const [sessionReady, setSessionReady] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [sessionQuestions, setSessionQuestions] = React.useState<UiQuestion[]>([]);
  const questions = sessionQuestions;
  const total = questions.length;
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [scoreRows, setScoreRows] = React.useState<ScoreRow[]>([]);
  const [feedbackPayload, setFeedbackPayload] = React.useState<AnswerWebhookResponse | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [micError, setMicError] = React.useState<string | null>(null);

  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const mimeRef = React.useRef<string>("");

  React.useEffect(() => {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) setRequiresLogin(true);
        });
      } catch {
        setRequiresLogin(true);
      }
    } else {
      setRequiresLogin(true);
    }

    const stored = loadActiveSession();
    if (stored?.session_id) setSessionId(stored.session_id);
    if (stored?.questions?.length) {
      setSessionQuestions(mapApiToUiQuestions(stored.questions));
    }
    setSessionReady(true);
  }, []);

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
    };
  }, []);

  const question = questions[currentIdx];

  const answeredSoFar = scoreRows;

  const overallAvg = React.useMemo(() => {
    if (!answeredSoFar.length) return 0;
    const sum = answeredSoFar.reduce((a, b) => a + b.score, 0);
    return sum / answeredSoFar.length;
  }, [answeredSoFar]);

  function cleanupRecording() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }

  async function startRecording() {
    if (!question || !sessionId) return;
    setSubmitError(null);
    setMicError(null);
    setFeedbackPayload(null);
    cleanupRecording();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickAudioMimeType();
      mimeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.start(250);
      setPhase("recording");
      void track("interview_start_recording", { questionId: question.id });
    } catch (e) {
      setMicError(e instanceof Error ? e.message : "Microphone access denied or unavailable.");
    }
  }

  async function stopAndSubmit() {
    if (!question || !sessionId) return;

    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      setSubmitError("Nothing to submit — start recording first.");
      return;
    }

    setPhase("thinking");
    setSubmitError(null);
    void track("interview_stop_and_submit", { questionId: question.id });

    const mime = recorder.mimeType || mimeRef.current || "audio/webm";
    const ext = extensionForMime(mime);

    const blob: Blob = await new Promise((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Recording failed"));
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        const b = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        resolve(b);
      };
      recorder.stop();
    });

    if (blob.size < 256) {
      setSubmitError("Recording was too short. Try again.");
      setPhase("idle");
      return;
    }

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch {
      setSubmitError("Sign-in is not available (check Supabase env on this deployment).");
      setPhase("idle");
      return;
    }
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      setSubmitError("You must be signed in to submit an answer.");
      setPhase("idle");
      return;
    }

    try {
      const data = await submitAnswerMultipart({
        audio: blob,
        audioFilename: `answer.${ext}`,
        userId: user.id,
        sessionId,
        questionId: question.id,
      });

      setFeedbackPayload(data);
      setScoreRows((prev) => {
        if (prev.some((r) => r.id === question.id)) return prev;
        return [
          ...prev,
          {
            id: question.id,
            category: question.category,
            score: data.score,
            feedback: data.feedback,
          },
        ];
      });
      setPhase("feedback");
      void track("interview_feedback_shown", { questionId: question.id, score: data.score });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not analyze your answer.");
      setPhase("idle");
    }
  }

  function nextQuestion() {
    if (!question) return;
    cleanupRecording();
    setFeedbackPayload(null);
    setSubmitError(null);

    const next = currentIdx + 1;
    if (next >= total) {
      void track("interview_finish_session");
      window.location.href = "/app/report";
      return;
    }
    void track("interview_next_question", { fromQuestionId: question.id, toIndex: next });
    setCurrentIdx(next);
    setPhase("idle");
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
          <Stepper currentStep={2} />
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading session…
          </div>
        </div>
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
          <Stepper currentStep={2} />
          <div className="mt-8 mx-auto w-full max-w-2xl">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Sign in required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                You need to sign in to start an interview session.
                <div>
                  <Button
                    onClick={() => void signInWithGoogle("/app/interview")}
                    className="mt-3"
                  >
                    Sign in with Google
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (total === 0 || !question) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
          <Stepper currentStep={2} />
          <div className="mt-8 mx-auto w-full max-w-2xl">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">No questions loaded</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Generate your question bank from a job description on the intake step, then open the mock
                  interview again.
                </p>
                <Button asChild>
                  <Link href="/app/intake">Go to intake</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
          <Stepper currentStep={2} />
          <div className="mt-8 mx-auto w-full max-w-2xl">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Session not found</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>We couldn&apos;t find a session id for this interview. Run intake again to generate questions.</p>
                <Button asChild>
                  <Link href="/app/intake">Go to intake</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
        <Stepper currentStep={2} />

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Question {question.order}
                </span>{" "}
                of {total}
              </div>
              <Badge className="bg-background" variant="outline">
                {question.category}
              </Badge>
            </div>

            <QuestionCard
              title="Question"
              question={question.prompt}
              className="border-gray-200"
            >
              <Waveform isAnimating={phase === "recording"} />

              {micError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {micError}
                </div>
              ) : null}

              {submitError && phase === "idle" ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                {phase === "idle" ? (
                  <Button size="lg" onClick={() => void startRecording()} disabled={!sessionId}>
                    <Mic className="h-4 w-4" />
                    Start recording
                  </Button>
                ) : null}

                {phase === "recording" ? (
                  <Button size="lg" onClick={() => void stopAndSubmit()}>
                    Stop &amp; submit
                  </Button>
                ) : null}

                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => {
                    void track("interview_skip_question", { questionId: question.id });
                    nextQuestion();
                  }}
                  className="justify-start"
                  disabled={phase === "thinking"}
                >
                  <SkipForward className="h-4 w-4" />
                  Skip question
                </Button>
              </div>

              {phase === "thinking" ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting your answer…
                </div>
              ) : null}

              {phase === "feedback" && feedbackPayload ? (
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-lg">Coach feedback</CardTitle>
                      <Badge className={scoreTone(feedbackPayload.score)}>
                        {feedbackPayload.score}/10
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="font-semibold">Summary</div>
                      <div className="text-muted-foreground">{feedbackPayload.feedback}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Strength</div>
                      <div className="text-muted-foreground">{feedbackPayload.strength}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Improvement</div>
                      <div className="text-muted-foreground">{feedbackPayload.improvement}</div>
                    </div>
                    {(() => {
                      const example = extractExampleAnswerFromPayload(feedbackPayload);
                      return (
                        <div className="rounded-lg border border-foreground/15 border-l-4 border-l-foreground/25 bg-muted/50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Example answer
                          </div>
                          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {example ?? (
                              <span className="text-muted-foreground">
                                Not included in the API response (confirm{" "}
                                <code className="rounded bg-background px-1 py-0.5 text-xs">example_answer</code>{" "}
                                is in your webhook JSON).
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    {feedbackPayload.framework_used &&
                    feedbackPayload.framework_used !== "None" ? (
                      <div className="text-xs text-muted-foreground">
                        Framework: {feedbackPayload.framework_used}
                      </div>
                    ) : null}
                    <div className="flex justify-end">
                      <Button onClick={nextQuestion}>Next question</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </QuestionCard>
          </div>

          <aside className="w-full lg:w-[360px]">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">Session progress</CardTitle>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall score so far</span>
                    <span className="font-semibold">{overallAvg.toFixed(1)} avg</span>
                  </div>
                  <Progress value={Math.round((overallAvg / 10) * 100)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {questions.map((q) => {
                  const scored = answeredSoFar.find((r) => r.id === q.id);
                  const isUpcoming = !scored && q.id !== question.id;

                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">Q{q.order}</div>
                        <div className="truncate text-xs text-muted-foreground">{q.category}</div>
                      </div>
                      {scored ? (
                        <Badge className={scoreTone(scored.score)}>{scored.score.toFixed(0)}/10</Badge>
                      ) : isUpcoming ? (
                        <Badge className="bg-muted text-muted-foreground hover:bg-muted">
                          <Lock className="h-3.5 w-3.5" />
                          Locked
                        </Badge>
                      ) : (
                        <Badge className="bg-background text-foreground hover:bg-background" variant="outline">
                          Current
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

