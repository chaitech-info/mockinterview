/** Shape the UI consumes (same fields the pages already used). */
export type AuthUser = {
  id: string;
  email: string | null;
  user_metadata: { full_name?: string; avatar_url?: string };
};

export function toAuthUser(u: {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): AuthUser {
  return {
    id: u.id,
    email: u.email ?? null,
    user_metadata: {
      ...(u.name ? { full_name: u.name } : {}),
      ...(u.image ? { avatar_url: u.image } : {}),
    },
  };
}
