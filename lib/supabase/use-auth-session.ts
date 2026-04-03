"use client";

import * as React from "react";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserProfile } from "@/lib/supabase/user-profile";

export type AuthSessionStatus = "loading" | "signed_in" | "signed_out";

/**
 * Mirrors session handling in AuthButton so landing CTAs can match sign-in state.
 */
export function useAuthSession(): AuthSessionStatus {
  const [status, setStatus] = React.useState<AuthSessionStatus>("loading");

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus("signed_out");
      return;
    }

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      setStatus("signed_out");
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        const user = data.session?.user ?? null;
        const profile = user ? getUserProfile(user) : null;
        setStatus(data.session && profile ? "signed_in" : "signed_out");
      })
      .catch(() => setStatus("signed_out"));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      const profile = user ? getUserProfile(user) : null;
      setStatus(session && profile ? "signed_in" : "signed_out");
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return status;
}
