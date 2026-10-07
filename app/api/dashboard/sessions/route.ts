import { NextResponse } from "next/server";

import { getAuthedUser } from "@/lib/auth/current-user";
import { query } from "@/lib/db/server";
import {
  SESSIONS_LIST_SELECT,
  mapSessionRowsToSummaries,
} from "@/lib/sessions/interview-session";

export const dynamic = "force-dynamic";

/** Lists sessions for the signed-in user. */
export async function GET() {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rows = await query(
      `select ${SESSIONS_LIST_SELECT} from sessions where user_id = $1::uuid order by created_at desc`,
      [user.id]
    );
    return NextResponse.json({ sessions: mapSessionRowsToSummaries(rows) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list sessions" },
      { status: 500 }
    );
  }
}
