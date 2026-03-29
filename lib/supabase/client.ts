"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function readSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/**
 * Browser Supabase client must use @supabase/ssr createBrowserClient so the
 * session lives in the same cookies that /auth/callback sets via
 * exchangeCodeForSession. Plain createClient() from supabase-js only uses
 * localStorage — OAuth then "succeeds" on the server but the UI stays signed out.
 */
export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  const env = readSupabaseEnv();
  if (!env) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (all environments you use), save, then redeploy so the build picks them up."
    );
  }

  try {
    cached = createBrowserClient(env.url, env.anonKey);
    return cached;
  } catch (e) {
    console.error("[PrepAI] createBrowserClient failed:", e);
    throw new Error(
      "Supabase client could not be created. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (no extra quotes or line breaks)."
    );
  }
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseEnv() !== null;
}
