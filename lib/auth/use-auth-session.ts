"use client";

import * as React from "react";

import { authClient } from "@/lib/auth/client";
import { toAuthUser, type AuthUser } from "@/lib/auth/types";

export type AuthSessionState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "signed_out" }
  | { status: "signed_in"; user: AuthUser };

/**
 * Session from Neon Auth. The returned object is memoised on the user's identity so pages can
 * safely list it in effect dependencies without re-running on every render.
 */
export function useAuthSession(): AuthSessionState {
  const { data, isPending } = authClient.useSession();
  const id = data?.user?.id;
  const email = data?.user?.email;
  const name = data?.user?.name;
  const image = data?.user?.image;

  return React.useMemo<AuthSessionState>(() => {
    if (isPending) return { status: "loading" };
    if (!id) return { status: "signed_out" };
    return { status: "signed_in", user: toAuthUser({ id, email, name, image }) };
  }, [isPending, id, email, name, image]);
}
