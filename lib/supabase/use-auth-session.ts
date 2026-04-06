"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type AuthSessionState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "signed_out" }
  | { status: "signed_in"; user: User };

/**
 * Session from the browser Supabase client (cookie-backed via createBrowserClient).
 * Uses onAuthStateChange so INITIAL_SESSION runs after storage is ready — a one-shot
 * getUser()/getSession() on mount often returns null while the OAuth cookie is still hydrating.
 */
export function useAuthSession(): AuthSessionState {
  const [state, setState] = React.useState<AuthSessionState>(() =>
    isSupabaseConfigured() ? { status: "loading" } : { status: "unconfigured" }
  );

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState({ status: "unconfigured" });
      return;
    }

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      setState({ status: "unconfigured" });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session?.user
          ? { status: "signed_in", user: session.user }
          : { status: "signed_out" }
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
