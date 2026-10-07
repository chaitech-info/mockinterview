"use client";

import { authClient } from "@/lib/auth/client";
import { toAuthUser, type AuthUser } from "@/lib/auth/types";

/** One-shot read of the current session (e.g. on a button click). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await authClient.getSession();
  return data?.user ? toAuthUser(data.user) : null;
}
