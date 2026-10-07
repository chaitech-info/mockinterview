import { auth } from "@/lib/auth/server";
import { query } from "@/lib/db/server";

export type AppUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

/**
 * The signed-in user for a Route Handler / Server Component, or null.
 * Also lazily creates the profile (1 free credit) and plan row via ensure_user().
 */
export async function getAuthedUser(): Promise<AppUser | null> {
  const { data: session } = await auth.getSession();
  const u = session?.user;
  if (!u?.id) return null;
  await query("select ensure_user($1::uuid)", [u.id]);
  return {
    id: u.id,
    email: u.email ?? null,
    name: u.name ?? null,
    image: u.image ?? null,
  };
}
