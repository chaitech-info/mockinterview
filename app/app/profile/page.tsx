"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/firebase/client";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { signInWithGoogle, signOut } from "@/lib/supabase/auth";
import { getUserProfile } from "@/lib/supabase/user-profile";

export default function ProfilePage() {
  const [phase, setPhase] = React.useState<"loading" | "sign_in" | "ready">("loading");
  const [email, setEmail] = React.useState<string | null>(null);
  const [name, setName] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [credits, setCredits] = React.useState<number | null>(null);

  React.useEffect(() => {
    void track("profile_view");
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured()) {
        setPhase("sign_in");
        return;
      }

      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setPhase("sign_in");
        return;
      }

      const profile = getUserProfile(user);
      if (!cancelled) {
        setEmail(profile.email);
        setName(profile.name);
        setAvatarUrl(profile.avatarUrl);
      }

      try {
        const r = await fetch("/api/entitlements", { cache: "no-store" });
        const data = (await r.json()) as { ok?: boolean; interviewCredits?: number };
        if (!cancelled && data.ok && typeof data.interviewCredits === "number") {
          setCredits(data.interviewCredits);
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) setPhase("ready");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-2 px-4 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading profile…
        </div>
      </div>
    );
  }

  if (phase === "sign_in") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Sign in to view your profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Your profile and interview balance are tied to your account.</p>
              <Button onClick={() => void signInWithGoogle("/app/profile")}>Sign in with Google</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const label = name ?? email ?? "Account";

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
            <User className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">Account and interview credits</p>
          </div>
        </div>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
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

        <Card className="mt-6 border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Interview credits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Each credit lets you run <strong className="text-foreground">one</strong> mock interview from
              a job description. Your first credit is included when you sign up.
            </p>
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Balance
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                {credits !== null ? credits : "—"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/#pricing">Buy credits</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/dashboard">Past interviews</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <Button
            variant="outline"
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
