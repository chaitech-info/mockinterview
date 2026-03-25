"use client";

import * as React from "react";
import { Loader2, Mic, Play, SkipForward } from "lucide-react";

import { QuestionCard } from "@/components/QuestionCard";
import { Stepper } from "@/components/Stepper";
import { Waveform } from "@/components/Waveform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { interviewQuestionsMock, questionScoresMock } from "@/lib/mock-data";

type Phase = "idle" | "recording" | "thinking" | "feedback";

function scoreTone(score: number) {
  if (score >= 8) return "bg-foreground text-background";
  if (score >= 5) return "bg-muted text-foreground";
  return "bg-muted/70 text-foreground";
}

export default function InterviewPage() {
  const total = interviewQuestionsMock.length;
  const [currentIdx, setCurrentIdx] = React.useState(2); // Q3
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [lastScore, setLastScore] = React.useState<number | null>(null);

  const question = interviewQuestionsMock[currentIdx] ?? interviewQuestionsMock[0];

  const answeredSoFar = React.useMemo(() => {
    const base = questionScoresMock.slice(0, 2); // Q1/Q2 scored
    if (lastScore !== null) {
      const existing = base.find((r) => r.id === question.id);
      if (!existing) {
        base.push({
          id: question.id,
          category: question.category,
          score: lastScore,
          feedback: "Good structure; add one more concrete metric.",
        });
      }
    }
    return base;
  }, [lastScore, question.id, question.category]);

  const overallAvg = React.useMemo(() => {
    if (!answeredSoFar.length) return 0;
    const sum = answeredSoFar.reduce((a, b) => a + b.score, 0);
    return sum / answeredSoFar.length;
  }, [answeredSoFar]);

  function startRecording() {
    setPhase("recording");
    window.setTimeout(() => {
      setPhase("thinking");
      window.setTimeout(() => {
        setLastScore(7);
        setPhase("feedback");
      }, 900);
    }, 3000);
  }

  function stopAndSubmit() {
    setPhase("thinking");
    window.setTimeout(() => {
      setLastScore(7);
      setPhase("feedback");
    }, 900);
  }

  function nextQuestion() {
    const next = currentIdx + 1;
    if (next >= total) {
      window.location.href = "/app/report";
      return;
    }
    setCurrentIdx(next);
    setPhase("idle");
    setLastScore(null);
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
                  Question {question.id}
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
              <Waveform active={phase === "recording"} />

              <div className="flex flex-col gap-3 sm:flex-row">
                {phase === "idle" ? (
                  <Button size="lg" onClick={startRecording}>
                    <Mic className="h-4 w-4" />
                    Start recording
                  </Button>
                ) : null}

                {phase === "recording" ? (
                  <Button size="lg" onClick={stopAndSubmit}>
                    Stop &amp; submit
                  </Button>
                ) : null}

                <Button
                  size="lg"
                  variant="ghost"
                  onClick={nextQuestion}
                  className="justify-start"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip question
                </Button>
              </div>

              {phase === "thinking" ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Coach is thinking…
                </div>
              ) : null}

              {phase === "feedback" ? (
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-lg">Coach feedback</CardTitle>
                      <Badge className={scoreTone(lastScore ?? 7)}>
                        {(lastScore ?? 7)}/10
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="font-semibold">Strength</div>
                      <div className="text-muted-foreground">
                        Strong use of the STAR framework — clear situation and task
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold">Improvement</div>
                      <div className="text-muted-foreground">
                        Add specific metrics — e.g. how many stakeholders, what was the business impact?
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button variant="outline">
                        <Play className="h-4 w-4" />
                        Hear coach feedback ▶
                      </Button>
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
                {interviewQuestionsMock.map((q) => {
                  const scored = answeredSoFar.find((r) => r.id === q.id);
                  const isUpcoming = !scored && q.id !== question.id;

                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">Q{q.id}</div>
                        <div className="truncate text-xs text-muted-foreground">{q.category}</div>
                      </div>
                      {scored ? (
                        <Badge className={scoreTone(scored.score)}>{scored.score.toFixed(0)}/10</Badge>
                      ) : isUpcoming ? (
                        <Badge className="bg-muted text-muted-foreground hover:bg-muted">Locked</Badge>
                      ) : (
                        <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Current</Badge>
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

