import { NextResponse } from "next/server";

import { getAuthedUser } from "@/lib/auth/current-user";
import { getEntitlementsForUser } from "@/lib/entitlements/resolve";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const entitlements = await getEntitlementsForUser(user.id);
    return NextResponse.json({ ok: true, ...entitlements });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load entitlements";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
