"use client";

import type { AuthError } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";

const NEXT_KEY = "prepai_auth_next";

function safeNextPath(next?: string) {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}

export async function signInWithGoogle(next?: string) {
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      data: null,
      error: { message: msg, name: "ConfigurationError" } as AuthError,
    };
  }
  const nextPath = safeNextPath(next);

  try {
    window.localStorage.setItem(NEXT_KEY, nextPath);
  } catch {
    // ignore
  }

  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
    nextPath
  )}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return { data, error };
}

export async function signOut() {
  try {
    const supabase = getSupabaseClient();
    return await supabase.auth.signOut();
  } catch (e) {
    console.error("[PrepAI] signOut:", e);
  }
}

export function popNextPath(): string | null {
  try {
    const v = window.localStorage.getItem(NEXT_KEY);
    if (v) window.localStorage.removeItem(NEXT_KEY);
    return v;
  } catch {
    return null;
  }
}

