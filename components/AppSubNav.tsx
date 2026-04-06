"use client";

import * as React from "react";
import Link from "next/link";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Shared links for all /app/* routes so users can reach Dashboard without returning home.
 */
export function AppSubNav() {
  const [credits, setCredits] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let cancelled = false;
    void (async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
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
  }, []);

  return (
    <nav
      className="border-b border-border bg-background/95 backdrop-blur"
      aria-label="App"
    >
      <div className="mx-auto flex min-h-11 max-w-6xl flex-wrap items-center justify-center gap-2 px-4 py-2 text-sm sm:justify-end sm:gap-3 sm:py-1.5">
        <Link
          href="/"
          className="shrink-0 rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Home
        </Link>
        <Link
          href="/app/dashboard"
          className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          Dashboard
        </Link>
        <Link
          href="/app/intake"
          className="shrink-0 rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          New interview
        </Link>
        <Link
          href="/app/profile"
          className="shrink-0 rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Profile
        </Link>
        {credits !== null ? (
          <span
            className="shrink-0 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium tabular-nums text-foreground"
            title="Interview credits remaining"
          >
            Interviews left: {credits}
          </span>
        ) : null}
      </div>
    </nav>
  );
}
