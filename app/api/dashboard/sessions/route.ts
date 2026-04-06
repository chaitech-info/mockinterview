import { NextResponse } from "next/server";

import {
  SESSIONS_LIST_SELECT,
  mapSessionRowsToSummaries,
} from "@/lib/supabase/interview-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Lists sessions for the signed-in user using the server Supabase client.
 * Same-origin fetch avoids browser "Failed to fetch" issues when calling Supabase REST directly.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on this deployment." },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select(SESSIONS_LIST_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions = mapSessionRowsToSummaries((data ?? []) as Record<string, unknown>[]);
  return NextResponse.json({ sessions });
}
