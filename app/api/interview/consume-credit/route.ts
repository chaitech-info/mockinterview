import { NextResponse } from "next/server";

import { getAuthedUser } from "@/lib/auth/current-user";
import { query } from "@/lib/db/server";
import { getEntitlementsForUser } from "@/lib/entitlements/resolve";

export const dynamic = "force-dynamic";

/**
 * Atomically decrements profiles.interview_credits by 1 when the user starts a mock interview.
 */
export async function POST() {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const [{ consumed }] = await query<{ consumed: boolean }>(
      "select consume_interview_credit($1::uuid) as consumed",
      [user.id]
    );
    const ent = await getEntitlementsForUser(user.id);

    if (!consumed) {
      return NextResponse.json(
        {
          ok: false,
          error: "no_credits",
          message:
            "You have no interview credits left. Purchase a credit pack to start a new mock interview.",
          interviewCredits: ent.interviewCredits,
          plan: ent.plan,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, interviewCredits: ent.interviewCredits, plan: ent.plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to consume interview credit";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
