"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Browser Supabase client must use @supabase/ssr createBrowserClient so the
 * session lives in the same cookies that /auth/callback sets via
 * exchangeCodeForSession. Plain createClient() from supabase-js only uses
 * localStorage — OAuth then "succeeds" on the server but the UI stays signed out.
 */
export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}

