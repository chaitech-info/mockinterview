"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { cn } from "@/lib/utils";

const linkBase =
  "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200";

const linkInactive =
  "text-muted-foreground hover:bg-[#f4f1ee] hover:text-foreground";

const linkActive =
  "border border-[#e4e2e2] bg-[#f4f1ee] font-semibold text-foreground shadow-sm hover:bg-[#ebe4dc]";

const CREDITS_UPDATED_EVENT = "interviewCreditsUpdated";

/**
 * Shared links for all /app/* routes — pill bar aligned with the marketing header.
 */
function appNavSelection(pathname: string | null) {
  const p = pathname ?? "";
  return {
    dashboard: p === "/app/dashboard" || p.startsWith("/app/report"),
    intake: p.startsWith("/app/intake") || p.startsWith("/app/interview"),
    profile: p.startsWith("/app/profile"),
  };
}

export function AppSubNav() {
  const pathname = usePathname();
  const navSel = appNavSelection(pathname);
  const auth = useAuthSession();
  const [credits, setCredits] = React.useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCredits(null);
      setCreditsLoading(false);
      return;
    }
    if (auth.status !== "signed_in") {
      setCredits(null);
      setCreditsLoading(false);
      return;
    }

    let cancelled = false;
    setCredits(null);
    setCreditsLoading(true);
    void (async () => {
      try {
        const r = await fetch("/api/entitlements", { cache: "no-store" });
        const data = (await r.json()) as { ok?: boolean; interviewCredits?: number };
        if (!cancelled && data.ok && typeof data.interviewCredits === "number") {
          setCredits(data.interviewCredits);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setCreditsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  React.useEffect(() => {
    const onCreditsUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ credits?: number }>;
      if (typeof ce.detail?.credits === "number") {
        setCredits(ce.detail.credits);
        setCreditsLoading(false);
      }
    };
    window.addEventListener(CREDITS_UPDATED_EVENT, onCreditsUpdated);
    return () => window.removeEventListener(CREDITS_UPDATED_EVENT, onCreditsUpdated);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4e2e2]/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto max-w-[1072px] px-4 py-3 sm:px-6 sm:py-4">
        <div
          className={cn(
            "flex min-h-12 w-full flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#e4e2e2] bg-white/90 px-3 py-2 shadow-[0_8px_40px_-12px_rgba(26,22,21,0.1)] backdrop-blur-xl sm:min-h-[60px] sm:rounded-full sm:px-4 sm:py-0"
          )}
        >
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2 pl-0.5 sm:pl-1"
            aria-label="Mock Interview home"
          >
            <Image
              src="/logo.jpeg"
              alt=""
              width={200}
              height={40}
              className="h-8 w-auto max-w-[120px] object-contain object-left sm:h-9 sm:max-w-[180px]"
              priority
            />
            <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
              Mock Interview
            </span>
          </Link>

          <nav
            className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1 sm:w-auto sm:justify-end sm:gap-1 sm:px-1"
            aria-label="App"
          >
            <Link href="/" className={cn(linkBase, linkInactive)}>
              Home
            </Link>
            <Link
              href="/app/dashboard"
              className={cn(linkBase, navSel.dashboard ? linkActive : linkInactive)}
              aria-current={navSel.dashboard ? "page" : undefined}
            >
              Dashboard
            </Link>
            <Link
              href="/app/intake"
              className={cn(linkBase, navSel.intake ? linkActive : linkInactive)}
              aria-current={navSel.intake ? "page" : undefined}
            >
              New interview
            </Link>
            <Link
              href="/app/profile"
              className={cn(linkBase, navSel.profile ? linkActive : linkInactive)}
              aria-current={navSel.profile ? "page" : undefined}
            >
              Profile
            </Link>
            {auth.status === "signed_in" && isSupabaseConfigured() ? (
              creditsLoading ? (
                <span
                  className="inline-flex max-w-full shrink-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-[#e4e2e2] bg-[#faf8f6] px-3 py-2 text-xs font-semibold shadow-sm"
                  role="status"
                  aria-busy="true"
                  aria-live="polite"
                  aria-label="Loading interview credits"
                >
                  <span className="whitespace-nowrap text-muted-foreground">Interviews left:</span>
                  <span
                    className="inline-block h-4 min-w-[1.75rem] rounded-md bg-[#d8d4cf]/95 animate-pulse sm:min-w-[2.25rem]"
                    title="Loading balance"
                    aria-hidden
                  />
                </span>
              ) : credits !== null ? (
                <span
                  className="shrink-0 rounded-full border border-[#e4e2e2] bg-[#faf8f6] px-3 py-2 text-xs font-semibold tabular-nums text-foreground shadow-sm"
                  title="Interview credits remaining"
                >
                  <span className="text-muted-foreground">Interviews left:</span>{" "}
                  <span className="text-foreground">{credits}</span>
                </span>
              ) : null
            ) : null}
          </nav>
        </div>
      </div>
    </header>
  );
}
