"use client";

import * as React from "react";
import Link from "next/link";
import { Download, RotateCcw } from "lucide-react";

import { ScoreCard } from "@/components/ScoreCard";
import { Stepper } from "@/components/Stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  averageScore,
  improvementsFromRows,
  letterGrade,
  metricsByCategory,
  overallSubtext,
  strengthsFromRows,
  studyPlanFromSnapshot,
} from "@/lib/report-build";
import { loadReportSnapshot } from "@/lib/report-snapshot";
import { track } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

function scoreTone(score: number) {
  if (score >= 8) return "bg-foreground text-background";
  if (score >= 5) return "bg-muted text-foreground";
  return "bg-muted/70 text-foreground";
}

export default function ReportPage() {
  const [downloading, setDownloading] = React.useState(false);
  const snapshot = React.useMemo(() => loadReportSnapshot(), []);

  const avg = snapshot ? averageScore(snapshot.rows) : null;
  const metrics = snapshot ? metricsByCategory(snapshot.rows) : null;
  const strengths = snapshot ? strengthsFromRows(snapshot.rows) : [];
  const improvements = snapshot ? improvementsFromRows(snapshot.rows) : [];
  const studyPlan = snapshot ? studyPlanFromSnapshot(snapshot) : [];

  function downloadPdfMock() {
    setDownloading(true);
    void track("report_download_pdf");
    window.setTimeout(() => {
      setDownloading(false);
      window.alert("PDF export is not wired yet — your scores above are saved from this session.");
    }, 900);
  }

  if (!snapshot?.rows?.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
          <Stepper currentStep={3} />
          <Card className="mt-8 border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">No report data yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Complete a mock interview and use <strong>Next question</strong> through the last
                question to generate your report. Opening this page directly won&apos;t show scores.
              </p>
              <Button asChild>
                <Link href="/app/interview">Go to mock interview</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const gradeDisplay = avg != null ? letterGrade(avg) : "—";
  const subtext =
    avg != null ? overallSubtext(avg) : "Submit recorded answers to see an overall score.";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
        <Stepper currentStep={3} />

        <div className="mt-8 space-y-8">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Overall grade</div>
                  <div className="flex items-center gap-3">
                    {avg != null ? (
                      <Badge className="bg-foreground text-background hover:bg-foreground">
                        {gradeDisplay}
                      </Badge>
                    ) : (
                      <Badge variant="outline">—</Badge>
                    )}
                    <div className="text-2xl font-semibold tracking-tight">
                      {avg != null ? `${avg.toFixed(1)} / 10` : "— / 10"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">{subtext}</div>
            </CardHeader>
          </Card>

          {metrics ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ScoreCard label="Behavioral" score={metrics.Behavioral} />
              <ScoreCard label="Technical" score={metrics.Technical} />
              <ScoreCard label="Situational" score={metrics.Situational} />
              <ScoreCard label="Culture fit" score={metrics["Culture-fit"]} />
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Strengths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {strengths.length ? (
                  strengths.map((s) => (
                    <div
                      key={s}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="border-l-4 border-foreground pl-3 text-sm font-medium">
                        {s}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Coach &quot;Strength&quot; lines from your scored answers will appear here.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Areas to improve</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {improvements.length ? (
                  improvements.map((s) => (
                    <div
                      key={s}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="border-l-4 border-muted-foreground/40 pl-3 text-sm font-medium">
                        {s}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Coach improvement tips from your scored answers will appear here.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Study plan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-3">
                {studyPlan.map((s) => (
                  <li
                    key={s}
                    className="rounded-xl border border-border bg-background p-4 text-sm"
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
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="border-b border-border pb-3 pr-4 font-medium">Q#</th>
                      <th className="border-b border-border pb-3 pr-4 font-medium">Category</th>
                      <th className="border-b border-border pb-3 pr-4 font-medium">Score</th>
                      <th className="border-b border-border pb-3 font-medium">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.rows.map((row) => (
                      <tr key={row.questionId} className="align-top">
                        <td className="border-b border-border py-4 pr-4 font-medium">
                          {row.order}
                        </td>
                        <td className="border-b border-border py-4 pr-4">{row.category}</td>
                        <td className="border-b border-border py-4 pr-4">
                          {row.skipped || row.score == null ? (
                            <Badge variant="outline">Skipped</Badge>
                          ) : (
                            <Badge className={cn(scoreTone(row.score))}>
                              {row.score.toFixed(1)}/10
                            </Badge>
                          )}
                        </td>
                        <td className="border-b border-border py-4 text-muted-foreground">
                          {row.skipped
                            ? "No answer submitted for this question."
                            : row.feedback || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-semibold">Ready to save this report?</div>
                <div className="text-sm text-muted-foreground">
                  Download a scored PDF and keep practicing.
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={downloadPdfMock} disabled={downloading}>
                  <Download className="h-4 w-4" />
                  {downloading ? "Preparing PDF…" : "Download PDF report"}
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a
                    href="/app/intake"
                    onClick={() => void track("report_start_new_session")}
                  >
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
