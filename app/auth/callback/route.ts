import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function safeNextPath(next: string | null) {
  if (!next) return "/app/intake";
  if (!next.startsWith("/")) return "/app/intake";
  if (next.startsWith("//")) return "/app/intake";
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });

  if (error) {
    const redirect = new URL("/", url.origin);
    redirect.searchParams.set("next", next);
    redirect.searchParams.set("auth_error", error);
    if (errorDescription) redirect.searchParams.set("auth_error_description", errorDescription);
    return NextResponse.redirect(redirect);
  }

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc("ensure_user_entitlements");
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

