"use client";

import * as React from "react";
import { LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { track } from "@/lib/firebase/client";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { popNextPath, signInWithGoogle, signOut } from "@/lib/supabase/auth";
import { getUserProfile } from "@/lib/supabase/user-profile";
import { clearUser, saveUser } from "@/lib/user-store";

type UserState =
  | { status: "loading" }
  | { status: "signed_out" }
  | {
      status: "signed_in";
      email: string | null;
      name: string | null;
      avatarUrl: string | null;
    };

export function AuthButton() {
  const [state, setState] = React.useState<UserState>({ status: "loading" });
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthError("Auth is not configured (missing Supabase env on this deployment).");
      setState({ status: "signed_out" });
      return;
    }

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start Supabase client.";
      setAuthError(msg);
      setState({ status: "signed_out" });
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        const user = data.session?.user ?? null;
        const profile = user ? getUserProfile(user) : null;
        setState(
          data.session && profile
            ? { status: "signed_in", ...profile }
            : { status: "signed_out" }
        );
        if (data.session && user && profile) {
          saveUser({
            id: user.id,
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
          });
        }
      })
      .catch(() => setState({ status: "signed_out" }));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      const profile = user ? getUserProfile(user) : null;
      setState(session && profile ? { status: "signed_in", ...profile } : { status: "signed_out" });

      if (_event === "SIGNED_IN") {
        void track("auth_signed_in");
        if (user && profile) {
          saveUser({
            id: user.id,
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

      if (_event === "SIGNED_OUT") {
        void track("auth_signed_out");
        clearUser();
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (state.status === "loading") {
    return (
      <Button variant="outline" disabled>
        <LogIn className="h-4 w-4" />
        Sign in
      </Button>
    );
  }

  if (state.status === "signed_in") {
    const label = state.name ?? state.email ?? "Signed in";
    return (
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 sm:flex">
          {state.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.avatarUrl}
              alt={label}
              className="h-8 w-8 rounded-full border border-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
              {(label[0] ?? "U").toUpperCase()}
            </div>
          )}
          <div className="max-w-[180px] truncate text-sm text-muted-foreground">
            {label}
          </div>
        </div>
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

