import { NextResponse } from "next/server";

import {
  SESSION_REPORT_SELECT,
  mapSessionRecordToInterviewRow,
} from "@/lib/supabase/interview-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Loads one session for the signed-in user (report view).
 * Same-origin fetch avoids browser "Failed to fetch" when calling Supabase REST from the client.
 */
export async function GET(request: Request) {
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

  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_REPORT_SELECT)
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({
    session: mapSessionRecordToInterviewRow(data as Record<string, unknown>),
  });
}
