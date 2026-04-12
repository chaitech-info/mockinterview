"use client";

import * as React from "react";
import Link from "next/link";

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { cn } from "@/lib/utils";

const linkBase =
  "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200";

const CREDITS_UPDATED_EVENT = "interviewCreditsUpdated";

/**
 * Shared links for all /app/* routes — pill bar aligned with the marketing header.
 */
export function AppSubNav() {
  const auth = useAuthSession();
  const [credits, setCredits] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (auth.status !== "signed_in") {
      setCredits(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/entitlements", { cache: "no-store" });
        const data = (await r.json()) as { ok?: boolean; interviewCredits?: number };
        if (!cancelled && data.ok && typeof data.interviewCredits === "number") {
          setCredits(data.interviewCredits);
        }
      } catch {
        /* ignore */
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
      }
    };
    window.addEventListener(CREDITS_UPDATED_EVENT, onCreditsUpdated);
    return () => window.removeEventListener(CREDITS_UPDATED_EVENT, onCreditsUpdated);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4e2e2]/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1072px] justify-center px-4 py-3 sm:px-6 sm:py-4">
        <nav
          className="flex w-full max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-[#e4e2e2] bg-white/90 px-2 py-1.5 shadow-[0_8px_40px_-12px_rgba(26,22,21,0.1)] backdrop-blur-xl sm:justify-end sm:gap-1 sm:px-3"
          aria-label="App"
        >
          <Link
            href="/"
            className={cn(linkBase, "text-muted-foreground hover:bg-[#f4f1ee] hover:text-foreground")}
          >
            Home
          </Link>
          <Link
            href="/app/dashboard"
            className={cn(
              linkBase,
              "border border-[#e4e2e2] bg-[#f4f1ee] font-semibold text-foreground shadow-sm hover:bg-[#ebe4dc]"
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/app/intake"
            className={cn(linkBase, "text-muted-foreground hover:bg-[#f4f1ee] hover:text-foreground")}
          >
            New interview
          </Link>
          <Link
            href="/app/profile"
            className={cn(linkBase, "text-muted-foreground hover:bg-[#f4f1ee] hover:text-foreground")}
          >
            Profile
          </Link>
          {credits !== null ? (
            <span
              className="shrink-0 rounded-full border border-[#e4e2e2] bg-[#faf8f6] px-3 py-2 text-xs font-semibold tabular-nums text-foreground"
              title="Interview credits remaining"
            >
              Interviews left: {credits}
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
