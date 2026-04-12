"use client";

import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  ClipboardList,
  FileCheck,
  FileText,
  Mic,
  Sparkles,
  Star,
} from "lucide-react";

import { AuthButton } from "@/components/AuthButton";
import { MoveIn, MoveInView } from "@/components/EntranceMotion";
import { PricingSection } from "@/components/PricingSection";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { Waveform } from "@/components/Waveform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/firebase/client";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Paste the job description",
    description:
      "Drop any posting—we pull out role, stack, and seniority so every question fits the real bar.",
    Icon: ClipboardList,
  },
  {
    step: "02",
    title: "Answer questions out loud",
    description:
      "Timed prompts and voice practice mirror interview pressure—not flashcards on a screen.",
    Icon: Mic,
  },
  {
    step: "03",
    title: "Get your scored report",
    description:
      "Strengths, gaps, and a tight prep plan land in one PDF you can revisit before the big day.",
    Icon: FileCheck,
  },
] as const;

/** Framer home (`obBLBu_h4`): max content width 1072px */
function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1072px] px-4 sm:px-6", className)}>{children}</div>
  );
}

const framerPillButtonPrimary =
  "h-12 rounded-full bg-[#1a1615] px-6 text-base font-semibold text-white shadow-sm transition-all duration-300 hover:bg-[#1a1615]/90 hover:shadow-md active:scale-[0.98]";
const framerPillButtonSecondary =
  "h-12 rounded-full border-0 bg-[#f4f1ee] px-6 text-base font-semibold text-foreground shadow-sm transition-all duration-300 hover:bg-[#f1ebe5] hover:shadow-md active:scale-[0.98]";

function AvatarStack() {
  const avatars = [
    { initials: "AR", bg: "bg-foreground" },
    { initials: "SK", bg: "bg-foreground/80" },
    { initials: "JM", bg: "bg-foreground/60" },
  ];

  return (
    <div className="flex items-center">
      {avatars.map((a, idx) => (
        <div
          key={a.initials}
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white",
            a.bg,
            idx ? "-ml-2" : "",
          ].join(" ")}
          aria-hidden
        >
          {a.initials}
        </div>
      ))}
    </div>
  );
}

function HeroMockup() {
  return (
    <Card className="group relative overflow-hidden rounded-[20px] border border-[#e4e2e2] bg-card shadow-[0_24px_80px_-24px_rgba(26,22,21,0.18)] transition-all duration-500 hover:shadow-[0_32px_90px_-28px_rgba(26,22,21,0.22)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      >
        <div className="animate-shimmer-slow absolute -inset-1 bg-[linear-gradient(105deg,transparent_40%,rgba(132,185,239,0.12)_50%,transparent_60%)]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-24 rotate-12 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.55),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">Mock interview</div>
            <CardTitle className="mt-1 text-base">Question 3 of 12</CardTitle>
          </div>
          <Badge className="rounded-full bg-foreground text-background hover:bg-foreground">7/10</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm font-semibold leading-snug">
          Align multiple stakeholders on a controversial product decision. What did you do, and what happened?
        </div>
        <Waveform isAnimating className="bg-background" />
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <Mic className="h-3.5 w-3.5" />
            Listening…
          </div>
          <div className="font-medium text-foreground">Coach feedback ready</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const authSession = useAuthSession();

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-orb-drift absolute left-1/2 top-[-18%] h-[min(90vw,640px)] w-[min(90vw,640px)] -translate-x-1/2 rounded-full bg-[hsl(var(--framer-blue-glow))] blur-[100px]" />
        <div className="animate-orb-drift-delayed absolute bottom-[-10%] right-[-8%] h-[min(70vw,480px)] w-[min(70vw,480px)] rounded-full bg-[#f4e6da]/80 blur-[90px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(132,185,239,0.08),transparent)]" />
      </div>

      <header className="sticky top-0 z-30 pt-4 pb-2">
        <Container>
          <MoveIn from="top" delayMs={0} durationMs={720} className="w-full">
            <div className="flex min-h-14 flex-col gap-3 rounded-full border border-[#e4e2e2] bg-white/90 py-2 px-3 shadow-[0_8px_40px_-12px_rgba(26,22,21,0.1)] backdrop-blur-xl sm:h-[60px] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0 sm:px-4">
            <a href="/" className="flex min-w-0 shrink-0 items-center gap-2 pl-1">
              <Image
                src="/logo.jpeg"
                alt=""
                width={200}
                height={40}
                className="h-9 w-auto max-w-[140px] object-contain object-left sm:max-w-[180px]"
                priority
              />
              <div className="hidden text-sm font-semibold tracking-tight sm:block">Mock Interview</div>
            </a>
            <nav
              className="flex w-full min-w-0 flex-wrap items-center justify-end gap-1 sm:w-auto sm:gap-2"
              aria-label="Primary"
            >
              <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full text-sm font-medium">
                <a href="#features" onClick={() => void track("landing_click_features")}>
                  Features
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full text-sm font-medium">
                <a href="#how-it-works" onClick={() => void track("landing_click_see_how_it_works_nav")}>
                  How it works
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full text-sm font-medium">
                <a href="#pricing" onClick={() => void track("landing_click_pricing")}>
                  Pricing
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full border-[#e4e2e2] font-semibold">
                <Link href="/app/dashboard" onClick={() => void track("landing_click_dashboard")}>
                  Dashboard
                </Link>
              </Button>
              {authSession.status !== "signed_in" ? (
                <Button
                  type="button"
                  size="sm"
                  className={cn(framerPillButtonPrimary, "h-9 px-4 text-sm")}
                  onClick={() => {
                    void track("landing_click_try_free");
                    void signInWithGoogle("/app/intake");
                  }}
                >
                  Try free
                </Button>
              ) : null}
              <div className="shrink-0 pl-1">
                <AuthButton />
              </div>
            </nav>
          </div>
          </MoveIn>
        </Container>
      </header>

      <main className="flex flex-col items-center gap-[120px] pb-24 pt-2 md:gap-32 md:pb-40">
        <section className="relative w-full">
          <Container>
            <div className="flex min-h-[min(80vh,1020px)] flex-col items-center gap-16 pt-12 md:gap-20 md:pt-24">
              <div className="flex w-full max-w-[792px] flex-col items-center gap-10 text-center">
                <div className="flex flex-col items-center gap-4">
                  <MoveIn from="bottom" delayMs={60} durationMs={780}>
                    <Badge
                      variant="outline"
                      className="rounded-full border-[#e4e2e2] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur-sm"
                    >
                      AI-powered interview coach
                    </Badge>
                  </MoveIn>
                  <MoveIn from="bottom" delayMs={140} durationMs={820}>
                    <h1 className="text-pretty text-4xl font-semibold leading-[1.12] tracking-[-0.03em] sm:text-5xl md:text-[52px] lg:text-[56px]">
                      Ace your next interview with an AI coach that actually listens
                    </h1>
                  </MoveIn>
                  <MoveIn from="bottom" delayMs={230} durationMs={800}>
                    <p className="max-w-[700px] text-pretty text-lg leading-[1.5] text-muted-foreground md:text-xl">
                      Paste a job description. Get a personalized question bank. Practice with voice. Receive a scored PDF report.
                    </p>
                  </MoveIn>
                </div>

                <MoveIn from="bottom" delayMs={320} durationMs={780}>
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                  {authSession.status === "signed_in" ? (
                    <Button asChild className={framerPillButtonPrimary}>
                      <a href="/app/intake" onClick={() => void track("landing_click_start_mock")}>
                        Start mock interview <ArrowRight className="ml-1 h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className={framerPillButtonPrimary}
                      onClick={() => {
                        void track("landing_click_try_free");
                        void signInWithGoogle("/app/intake");
                      }}
                    >
                      Try free <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                  <Button asChild className={framerPillButtonSecondary}>
                    <a href="#how-it-works" onClick={() => void track("landing_click_see_how_it_works")}>
                      See how it works
                    </a>
                  </Button>
                </div>
                </MoveIn>

                <MoveIn from="bottom" delayMs={400} durationMs={760}>
                  <div className="flex flex-col items-center gap-3 pt-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-center">
                    <div className="font-medium text-foreground">Trusted by 1,200+ job seekers</div>
                    <AvatarStack />
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-foreground text-foreground" />
                      <span className="font-medium text-foreground">4.9/5</span>
                      <span>rating</span>
                    </div>
                  </div>
                </MoveIn>
              </div>

              <div className="w-full max-w-[1072px]">
                <MoveIn from="bottom" delayMs={480} durationMs={900} withScale>
                  <div className="animate-float-soft">
                    <HeroMockup />
                  </div>
                </MoveIn>
              </div>
            </div>
          </Container>
        </section>

        <section id="features" className="w-full scroll-mt-28">
          <Container>
            <div className="flex flex-col items-center gap-14">
              <MoveInView from="bottom" delayMs={0} className="flex max-w-[800px] flex-col items-center gap-5 text-center">
                <h2 className="text-3xl font-semibold leading-[1.15] tracking-[-0.03em] sm:text-4xl md:text-[52px]">
                  Built for real interview performance
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Mock Interview turns any job description into a focused practice loop: questions, voice rehearsal, and actionable feedback.
                </p>
              </MoveInView>

              <div className="grid w-full gap-6 md:grid-cols-3 md:gap-8">
                <MoveInView from="bottom" delayMs={0} withScale>
                  <Card className="group h-full rounded-3xl border border-[#e4e2e2] bg-card shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(26,22,21,0.12)]">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e4e2e2] bg-[#f4f1ee] transition-colors duration-300 group-hover:bg-[#e8e0d8]">
                        <Sparkles className="h-5 w-5 text-foreground" />
                      </div>
                      <CardTitle className="text-lg font-semibold">Paste any job description</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      AI extracts role, skills, seniority in seconds
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-muted-foreground">
                    Get instant structure from messy postings, so your practice matches the role you want.
                  </CardContent>
                </Card>
                </MoveInView>
                <MoveInView from="bottom" delayMs={100} withScale>
                  <Card className="group h-full rounded-3xl border border-[#e4e2e2] bg-card shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(26,22,21,0.12)]">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e4e2e2] bg-[#f4f1ee] transition-colors duration-300 group-hover:bg-[#e8e0d8]">
                        <BrainCircuit className="h-5 w-5 text-foreground" />
                      </div>
                      <CardTitle className="text-lg font-semibold">Practice with your voice</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Real interview simulation, not just flashcards
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-muted-foreground">
                    Say answers out loud and learn to sound confident under time pressure.
                  </CardContent>
                </Card>
                </MoveInView>
                <MoveInView from="bottom" delayMs={200} withScale>
                  <Card className="group h-full rounded-3xl border border-[#e4e2e2] bg-card shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(26,22,21,0.12)]">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e4e2e2] bg-[#f4f1ee] transition-colors duration-300 group-hover:bg-[#e8e0d8]">
                        <FileText className="h-5 w-5 text-foreground" />
                      </div>
                      <CardTitle className="text-lg font-semibold">Get a scored PDF report</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Strengths, weaknesses, study plan delivered to your inbox
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-muted-foreground">
                    Walk away with a clear plan: what to keep doing and what to sharpen next.
                  </CardContent>
                </Card>
                </MoveInView>
              </div>
            </div>
          </Container>
        </section>

        <section id="how-it-works" className="w-full scroll-mt-28">
          <Container>
            <div className="relative overflow-hidden rounded-[32px] border border-[#e4e2e2] bg-gradient-to-b from-[#faf8f5] via-[#f7f4f0] to-[#f4f0eb] px-5 py-14 shadow-[0_28px_90px_-40px_rgba(26,22,21,0.14)] sm:px-8 md:py-20">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 top-0 h-[280px] w-[280px] rounded-full bg-[hsl(var(--framer-blue-glow))] opacity-[0.35] blur-[80px]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -left-16 bottom-0 h-[200px] w-[200px] rounded-full bg-[#e8dfd4]/70 blur-[64px]"
              />

              <div className="relative flex flex-col items-center gap-12 md:gap-16">
                <MoveInView
                  from="bottom"
                  delayMs={0}
                  className="flex max-w-[640px] flex-col items-center gap-4 text-center"
                >
                  <Badge
                    variant="outline"
                    className="rounded-full border-[#e4e2e2] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-sm backdrop-blur-sm"
                  >
                    Simple flow
                  </Badge>
                  <h2 className="text-3xl font-semibold leading-[1.12] tracking-[-0.03em] sm:text-4xl md:text-[48px]">
                    How it works
                  </h2>
                  <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                    From pasted job post to confident answers—three focused steps, no setup rabbit holes.
                  </p>
                </MoveInView>

                <div className="relative flex w-full max-w-[1000px] flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-0 lg:px-2">
                  {HOW_IT_WORKS_STEPS.map((s, idx) => (
                    <Fragment key={s.step}>
                      <MoveInView
                        from="bottom"
                        delayMs={idx * 100}
                        durationMs={780}
                        withScale
                        className="flex-1 min-w-0"
                      >
                        <div className="group relative flex h-full flex-col rounded-3xl border border-[#e4e2e2] bg-white/75 p-6 shadow-sm backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[#dcd8d4] hover:shadow-[0_24px_60px_-28px_rgba(26,22,21,0.14)] sm:p-8">
                          <div
                            aria-hidden
                            className="absolute right-5 top-5 font-mono text-4xl font-semibold tabular-nums text-[#1a1615]/[0.06] transition-colors duration-300 group-hover:text-[#1a1615]/[0.09]"
                          >
                            {s.step}
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e4e2e2] bg-[#f4f1ee] transition-colors duration-300 group-hover:bg-[#ebe4dc]">
                            <s.Icon className="h-5 w-5 text-foreground" aria-hidden />
                          </div>
                          <h3 className="mt-6 text-lg font-semibold leading-snug tracking-tight sm:text-xl">
                            {s.title}
                          </h3>
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                            {s.description}
                          </p>
                        </div>
                      </MoveInView>
                      {idx < HOW_IT_WORKS_STEPS.length - 1 ? (
                        <>
                          <div
                            className="flex shrink-0 justify-center py-1 lg:hidden"
                            aria-hidden
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e4e2e2] bg-white/80 shadow-sm">
                              <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground" strokeWidth={2} />
                            </div>
                          </div>
                          <div
                            className="hidden shrink-0 items-center justify-center self-center lg:flex"
                            aria-hidden
                          >
                            <div className="mx-1 flex h-11 w-11 items-center justify-center rounded-full border border-[#e4e2e2] bg-white/80 shadow-sm backdrop-blur-sm">
                              <ChevronRight className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                            </div>
                          </div>
                        </>
                      ) : null}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section id="pricing" className="w-full scroll-mt-28 rounded-[32px] bg-[#f1ebe5] py-16 md:py-24">
          <Container>
            <PricingSection signedIn={authSession.status === "signed_in"} />
          </Container>
        </section>
      </main>

      <footer className="border-t border-[#e4e2e2] bg-background pb-10 pt-12">
        <Container>
          <MoveInView from="bottom" delayMs={80} durationMs={820}>
            <div className="rounded-[32px] border border-[#e4e2e2] bg-white/70 p-8 shadow-sm backdrop-blur-md sm:p-10">
            <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex max-w-xs flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo.jpeg"
                    alt=""
                    width={200}
                    height={40}
                    className="h-9 w-auto max-w-[200px] object-contain object-left"
                  />
                  <div>
                    <div className="text-sm font-semibold">Mock Interview</div>
                    <div className="text-xs text-muted-foreground">AI-powered interview coach</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-10 sm:grid-cols-2">
                <div className="space-y-4">
                  <p className="text-[15px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Pages
                  </p>
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <a className="transition-colors hover:text-foreground" href="/">
                      Home
                    </a>
                    <a className="transition-colors hover:text-foreground" href="#features">
                      Features
                    </a>
                    <a className="transition-colors hover:text-foreground" href="#pricing">
                      Pricing
                    </a>
                    <Link className="transition-colors hover:text-foreground" href="/app/dashboard">
                      Dashboard
                    </Link>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[15px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Information
                  </p>
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <a className="transition-colors hover:text-foreground" href="#">
                      Privacy
                    </a>
                    <a className="transition-colors hover:text-foreground" href="#">
                      Terms
                    </a>
                    <a className="transition-colors hover:text-foreground" href="#">
                      Contact
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-2 border-t border-[#e4e2e2] pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} Mock Interview. All rights reserved.</span>
            </div>
          </div>
          </MoveInView>
        </Container>
      </footer>
    </div>
  );
}
