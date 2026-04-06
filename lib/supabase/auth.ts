"use client";

import type { AuthError } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";

const NEXT_KEY = "prepai_auth_next";

/**
 * OAuth redirect must use your real public origin. Set NEXT_PUBLIC_SITE_URL in
 * Vercel (e.g. https://mockinterview.info) so Google sign-in returns there, not
 * localhost — Supabase also needs this URL in Authentication → Redirect URLs.
 */
function oauthRedirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return window.location.origin;
}

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

  const redirectTo = `${oauthRedirectOrigin()}/auth/callback?next=${encodeURIComponent(
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

/**
 * Server-backed check: whether this email already has an account (auth.users).
 * Returns null if the request failed (network / misconfiguration).
 */
export async function checkEmailRegistered(email: string): Promise<boolean | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch("/api/auth/email-registered", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    const json = (await res.json()) as { ok?: boolean; exists?: boolean };
    if (json.ok && typeof json.exists === "boolean") return json.exists;
    return null;
  } catch {
    return null;
  }
}

