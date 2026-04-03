"use client";

import Image from "next/image";
import {
  ArrowRight,
  BrainCircuit,
  FileText,
  Mic,
  Sparkles,
  Star,
} from "lucide-react";

import { AuthButton } from "@/components/AuthButton";
import { PricingSection } from "@/components/PricingSection";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { Waveform } from "@/components/Waveform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/firebase/client";

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">{children}</div>;
}

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
    <Card className="group relative shadow-sm transition-shadow duration-300 hover:shadow-md">
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
          <Badge className="bg-foreground text-background hover:bg-foreground">7/10</Badge>
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <Image
                src="/logo.jpeg"
                alt=""
                width={200}
                height={40}
                className="h-9 w-auto max-w-[200px] object-contain object-left"
                priority
              />
              <div className="text-sm font-semibold tracking-tight">PrepAI</div>
            </a>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost">
                <a
                  href="#pricing"
                  onClick={() => void track("landing_click_pricing")}
                >
                  Pricing
                </a>
              </Button>
              {authSession !== "signed_in" ? (
                <Button asChild>
                  <a
                    href="/app/intake"
                    onClick={() => void track("landing_click_try_free")}
                  >
                    Try free — no signup
                  </a>
                </Button>
              ) : null}
              <AuthButton />
            </div>
          </div>
        </Container>
      </header>

      <main>
        <section className="relative overflow-hidden bg-background">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,0,0,0.06),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(0,0,0,0.04),transparent_40%)]"
          />
          <Container>
            <div className="grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
              <div className="space-y-6">
                <Badge className="bg-background/70 text-foreground hover:bg-background/70 shadow-sm" variant="outline">
                  AI-powered interview coach
                </Badge>
                <h1 className="animate-fade-up text-pretty text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  Ace your next interview with an AI coach that actually listens
                </h1>
                <p className="animate-fade-up-delayed max-w-xl text-pretty text-lg text-muted-foreground">
                  Paste a job description. Get a personalized question bank. Practice with voice. Receive a scored PDF report.
                </p>

                <div className="animate-fade-up-delayed2 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <a
                      href="/app/intake"
                      onClick={() =>
                        void track(
                          authSession === "signed_in"
                            ? "landing_click_start_mock"
                            : "landing_click_try_free"
                        )
                      }
                    >
                      {authSession === "signed_in" ? (
                        <>
                          Start mock interview <ArrowRight className="ml-1 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Try free — no signup <ArrowRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a
                      href="#how-it-works"
                      onClick={() => void track("landing_click_see_how_it_works")}
                    >
                      See how it works
                    </a>
                  </Button>
                </div>

                <div className="animate-fade-up-delayed2 flex flex-wrap items-center gap-3 pt-2 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Trusted by 1,200+ job seekers</div>
                  <AvatarStack />
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-foreground text-foreground" />
                    <span className="font-medium text-foreground">4.9/5</span>
                    <span>rating</span>
                  </div>
                </div>
              </div>

              <div className="lg:pl-8">
                <div className="animate-float-soft rounded-2xl bg-gradient-to-b from-muted/80 to-transparent p-4 sm:p-6">
                  <div className="animate-fade-up">
                    <HeroMockup />
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section className="bg-muted/60">
          <Container>
            <div className="py-16 lg:py-24">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Built for real interview performance
                </h2>
                <p className="mt-3 text-muted-foreground">
                  PrepAI turns any job description into a focused practice loop: questions, voice rehearsal, and actionable feedback.
                </p>
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-3">
                <Card className="group shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background">
                        <Sparkles className="h-5 w-5 text-foreground" />
                      </div>
                      <CardTitle className="text-lg">Paste any job description</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      AI extracts role, skills, seniority in seconds
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Get instant structure from messy postings, so your practice matches the role you want.
                  </CardContent>
                </Card>
                <Card className="group shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background">
                        <BrainCircuit className="h-5 w-5 text-foreground" />
                      </div>
                      <CardTitle className="text-lg">Practice with your voice</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Real interview simulation, not just flashcards
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Say answers out loud and learn to sound confident under time pressure.
                  </CardContent>
                </Card>
                <Card className="group shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background">
                        <FileText className="h-5 w-5 text-foreground" />
                      </div>
                      <CardTitle className="text-lg">Get a scored PDF report</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Strengths, weaknesses, study plan delivered to your inbox
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Walk away with a clear plan: what to keep doing and what to sharpen next.
                  </CardContent>
                </Card>
              </div>
            </div>
          </Container>
        </section>

        <section id="how-it-works" className="bg-background scroll-mt-24">
          <Container>
            <div className="py-16 lg:py-24">
              <div className="flex flex-col gap-3">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
                <p className="max-w-2xl text-muted-foreground">
                  Three steps from job description to a polished, confident performance.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
                {[
                  { step: "1", title: "Paste the job description" },
                  { step: "2", title: "Answer questions out loud" },
                  { step: "3", title: "Get your report" },
                ].map((s, idx, arr) => (
                  <div key={s.step} className="relative">
                    {idx < arr.length - 1 ? (
                      <div
                        aria-hidden
                        className="absolute right-[-18px] top-1/2 hidden h-px w-9 bg-border sm:block"
                      />
                    ) : null}
                    <Card className="shadow-sm transition-all duration-300 hover:shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                            {s.step}
                          </div>
                          <div className="text-base font-semibold">{s.title}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        <section id="pricing" className="bg-gray-50 scroll-mt-24">
          <Container>
            <div className="py-16 lg:py-24">
              <PricingSection signedIn={authSession === "signed_in"} />
            </div>
          </Container>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <Container>
          <div className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.jpeg"
                alt=""
                width={200}
                height={40}
                className="h-9 w-auto max-w-[200px] object-contain object-left"
              />
              <div>
                <div className="text-sm font-semibold">PrepAI</div>
                <div className="text-xs text-muted-foreground">AI-powered interview coach</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <a className="hover:text-foreground" href="#">
                Privacy
              </a>
              <a className="hover:text-foreground" href="#">
                Terms
              </a>
              <a className="hover:text-foreground" href="#">
                Contact
              </a>
            </div>
          </div>
          <div className="pb-10 text-xs text-muted-foreground">
            © {new Date().getFullYear()} PrepAI. All rights reserved.
          </div>
        </Container>
      </footer>
    </div>
  );
}
