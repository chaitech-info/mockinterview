"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Stepper } from "@/components/Stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { jdAnalysisMock } from "@/lib/mock-data";

type Phase = "idle" | "loading" | "results";

export default function IntakePage() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [jdText, setJdText] = React.useState("");
  const [loadingText, setLoadingText] = React.useState("Analyzing job description...");

  React.useEffect(() => {
    return () => {
      // cleanup: timeouts are cleared by virtue of unmount in this mock flow
    };
  }, []);

  function runMockAnalysis() {
    setPhase("loading");
    setLoadingText("Analyzing job description...");

    window.setTimeout(() => setLoadingText("Extracting required skills..."), 700);
    window.setTimeout(() => setLoadingText("Generating your question bank..."), 1400);
    window.setTimeout(() => setPhase("results"), 2000);
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
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Analysis complete</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-xs font-medium text-muted-foreground">Detected role</div>
                      <div className="mt-1 text-sm font-semibold">{jdAnalysisMock.role}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-xs font-medium text-muted-foreground">Company</div>
                      <div className="mt-1 text-sm font-semibold">{jdAnalysisMock.company}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-xs font-medium text-muted-foreground">Seniority</div>
                      <div className="mt-1 text-sm font-semibold">{jdAnalysisMock.seniority}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Top skills</div>
                    <div className="flex flex-wrap gap-2">
                      {jdAnalysisMock.topSkills.map((s) => (
                        <Badge key={s} className="bg-background" variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-medium">
                        {jdAnalysisMock.totalQuestions} questions generated across 4 categories
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(
                          Object.entries(jdAnalysisMock.questionCounts) as Array<
                            [keyof typeof jdAnalysisMock.questionCounts, number]
                          >
                        ).map(([k, v]) => (
                          <Badge key={k} className="bg-muted text-foreground hover:bg-muted">
                            {v} {k}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button asChild size="lg">
                      <a href="/app/interview">Start mock interview →</a>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPhase("idle");
                        setJdText("");
                      }}
                    >
                      Start over
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Textarea
                    rows={10}
                    placeholder="Paste the full job description here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="min-h-[220px]"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      size="lg"
                      disabled={phase === "loading"}
                      onClick={runMockAnalysis}
                    >
                      {phase === "loading" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {loadingText}
                        </>
                      ) : (
                        "Analyze job description →"
                      )}
                    </Button>

                    <div className="text-sm text-muted-foreground">
                      {phase === "loading" ? "This usually takes a moment." : "No signup required."}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

