import { createNeonAuth } from "@neondatabase/auth/next/server";

/** Server-side Neon Auth (managed Better Auth). Cookies are signed with NEON_AUTH_COOKIE_SECRET. */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    sameSite: "lax", // OAuth redirects back from Google must carry the cookie
  },
});
