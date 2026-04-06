"use client";

import type { User } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Prefer the in-memory session (from cookies) before validating with getUser().
 * A lone getUser() on click often returns null right after OAuth while the session exists.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user ?? null;
}
