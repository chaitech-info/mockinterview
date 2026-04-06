type UserMetadata = Record<string, unknown>;

export function getUserProfile(user: {
  email?: string | null;
  user_metadata?: UserMetadata;
}) {
  const meta = user.user_metadata ?? {};
  const fromGoogleNames = (() => {
    const gn = typeof meta.given_name === "string" ? meta.given_name.trim() : "";
    const fn = typeof meta.family_name === "string" ? meta.family_name.trim() : "";
    const joined = [gn, fn].filter(Boolean).join(" ");
    return joined.length > 0 ? joined : null;
  })();
  const name =
    (typeof meta.full_name === "string" ? meta.full_name : null) ??
    (typeof meta.name === "string" ? meta.name : null) ??
    fromGoogleNames ??
    (typeof meta.user_name === "string" ? meta.user_name : null) ??
    (typeof meta.preferred_username === "string" ? meta.preferred_username : null) ??
    null;
  const avatarUrl =
    (typeof meta.avatar_url === "string" ? meta.avatar_url : null) ??
    (typeof meta.picture === "string" ? meta.picture : null) ??
    null;
  const email = user.email ?? null;
  return { email, name, avatarUrl };
}
