"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/firebase/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import { signInWithGoogle, signOut } from "@/lib/supabase/auth";
import { getUserProfile } from "@/lib/supabase/user-profile";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { saveUser } from "@/lib/user-store";
import {
  appFlowMainClassName,
  appFlowPrimaryButtonClass,
  appFlowSecondaryPillClass,
  appFlowSurfaceCard,
} from "@/lib/app-flow-ui";
import { cn } from "@/lib/utils";

const profilePageShell = cn(
  appFlowMainClassName(true),
  "relative",
  /* Extra space below sticky AppSubNav */
  "pt-10 sm:pt-12 md:pt-16"
);

export default function ProfilePage() {
  const auth = useAuthSession();
  const [credits, setCredits] = React.useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = React.useState(false);

  const email = React.useMemo(() => {
    if (auth.status !== "signed_in") return null;
    return getUserProfile(auth.user).email;
  }, [auth]);

  const name = React.useMemo(() => {
    if (auth.status !== "signed_in") return null;
    return getUserProfile(auth.user).name;
  }, [auth]);

  const avatarUrl = React.useMemo(() => {
    if (auth.status !== "signed_in") return null;
    return getUserProfile(auth.user).avatarUrl;
  }, [auth]);

  React.useEffect(() => {
    void track("profile_view");
  }, []);

  React.useEffect(() => {
    if (auth.status !== "signed_in") {
      setCredits(null);
      setCreditsLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    const user = auth.user;
    const profile = getUserProfile(user);

    saveUser({
      id: user.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });

    void supabase.rpc("ensure_user_entitlements").then(
      () => {},
      () => {
        /* migration / network */
      }
    );

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

  if (auth.status === "unconfigured") {
    return (
      <div className={profilePageShell}>
        <Card className={appFlowSurfaceCard}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight">Sign in unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Supabase is not configured on this deployment.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (auth.status === "loading") {
    return (
      <div
        className={cn(
          profilePageShell,
          "flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground"
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading profile…
      </div>
    );
  }

  if (auth.status === "signed_out") {
    return (
      <div className={profilePageShell}>
        <Card className={appFlowSurfaceCard}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight">Sign in to view your profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Your profile and interview balance are tied to your account.</p>
            <Button className={appFlowPrimaryButtonClass} onClick={() => void signInWithGoogle("/app/profile")}>
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const label = name ?? email ?? "Account";

  return (
    <div className={profilePageShell}>
      <main>
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e4e2e2] bg-white/80 shadow-sm backdrop-blur-sm">
            <User className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">Account and interview credits</p>
          </div>
        </div>

        <Card className={appFlowSurfaceCard}>
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-full border border-border object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted text-lg font-semibold">
                  {(label[0] ?? "U").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium text-foreground">{label}</div>
                {email ? <div className="text-sm text-muted-foreground">{email}</div> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(appFlowSurfaceCard, "mt-6")}>
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">Interview credits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Each credit lets you run <strong className="text-foreground">one</strong> mock interview from
              a job description. Your first credit is included when you sign up.
            </p>
            <div className="rounded-2xl border border-[#e4e2e2] bg-[#faf8f6]/80 px-4 py-3 text-center backdrop-blur-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Balance
              </div>
              <div
                className="mt-1 flex min-h-[2.25rem] items-center justify-center"
                aria-busy={creditsLoading}
                aria-live="polite"
              >
                {creditsLoading ? (
                  <span
                    className="h-9 w-[4.5rem] max-w-[min(100%,7rem)] animate-pulse rounded-xl bg-[#d8d4cf]/90"
                    aria-hidden
                  />
                ) : (
                  <span className="text-3xl font-semibold tabular-nums text-foreground">
                    {credits !== null ? credits : "—"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild className={cn(appFlowSecondaryPillClass, "h-10 px-4 text-sm")}>
                <Link href="/#pricing">Buy credits</Link>
              </Button>
              <Button asChild className={cn(appFlowSecondaryPillClass, "h-10 px-4 text-sm")}>
                <Link href="/app/dashboard">Past interviews</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <Button
            variant="outline"
            className={appFlowSecondaryPillClass}
            onClick={() => {
              void signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      </main>
    </div>
  );
}
