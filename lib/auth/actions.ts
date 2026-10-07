"use client";

import { authClient } from "@/lib/auth/client";

const NEXT_KEY = "prepai_auth_next";

function safeNextPath(next?: string) {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}

/** Auth is always available once NEON_AUTH_BASE_URL is set on the server; kept for call-site parity. */
export function isAuthConfigured(): boolean {
  return true;
}

export async function signInWithGoogle(next?: string) {
  const nextPath = safeNextPath(next);
  try {
    window.localStorage.setItem(NEXT_KEY, nextPath);
  } catch {
    // ignore
  }
  const { data, error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: nextPath,
  });
  return { data, error };
}

export async function signOut() {
  try {
    return await authClient.signOut();
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

/** Server-backed check: does this email already have an account? null on failure. */
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
