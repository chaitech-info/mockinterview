"use client";

/** Short-lived JWT for the Python (Modal) backend, verified there against Neon Auth's JWKS. */
export async function getApiToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/token", { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string } | null;
    return data?.token ?? null;
  } catch {
    return null;
  }
}
