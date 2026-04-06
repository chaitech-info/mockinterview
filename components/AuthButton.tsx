"use client";

import * as React from "react";
import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { track } from "@/lib/firebase/client";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { popNextPath, signInWithGoogle, signOut } from "@/lib/supabase/auth";
import { getUserProfile } from "@/lib/supabase/user-profile";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { clearUser, saveUser } from "@/lib/user-store";

export function AuthButton() {
  const auth = useAuthSession();
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (auth.status !== "signed_in") return;

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      return;
    }

    const user = auth.user;
    const profile = getUserProfile(user);

    void supabase.rpc("ensure_user_entitlements").then(
      () => {},
      () => {
        /* migration may not be applied yet */
      }
    );

    saveUser({
      id: user.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });
  }, [auth]);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        void track("auth_signed_in");
        if (session?.user) {
          void supabase.rpc("ensure_user_entitlements").then(
            () => {},
            () => {
              /* migration may not be applied yet */
            }
          );
          const profile = getUserProfile(session.user);
          saveUser({
            id: session.user.id,
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
          });
        }
        const stored = popNextPath();
        if (stored && stored !== window.location.pathname + window.location.search) {
          window.location.assign(stored);
        }
      }

      if (event === "SIGNED_OUT") {
        void track("auth_signed_out");
        clearUser();
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (auth.status === "unconfigured") {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled>
          <LogIn className="h-4 w-4" />
          Sign in
        </Button>
        <div className="max-w-[min(100%,280px)] text-xs text-muted-foreground">
          Auth is not configured (missing Supabase env on this deployment).
        </div>
      </div>
    );
  }

  if (auth.status === "loading") {
    return (
      <Button variant="outline" disabled>
        <LogIn className="h-4 w-4" />
        Sign in
      </Button>
    );
  }

  if (auth.status === "signed_in") {
    const profile = getUserProfile(auth.user);
    const label = profile.name ?? profile.email ?? "Signed in";
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/app/profile"
          className="flex min-w-0 max-w-[min(100%,220px)] items-center gap-2 rounded-md px-1 py-0.5 outline-none ring-offset-background transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          title="Open profile"
          onClick={() => void track("auth_profile_click")}
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
              {(label[0] ?? "U").toUpperCase()}
            </div>
          )}
          <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground sm:inline">
            {label}
          </span>
        </Link>
        <Button
          variant="outline"
          onClick={async () => {
            void track("auth_sign_out_clicked");
            await signOut();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={async () => {
          setAuthError(null);
          void track("auth_sign_in_google_clicked");
          const params = new URLSearchParams(window.location.search);
          const nextFromQuery = params.get("next");
          const nextPath = nextFromQuery?.startsWith("/")
            ? nextFromQuery
            : window.location.pathname + window.location.search;
          const { error } = await signInWithGoogle(nextPath);
          if (error) {
            setAuthError(error.message);
            void track("auth_sign_in_error", { message: error.message });
          }
        }}
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </Button>
      {authError ? (
        <div className="max-w-[min(100%,280px)] text-xs text-muted-foreground">{authError}</div>
      ) : null}
    </div>
  );
}
