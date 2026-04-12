"use client";

import { MoveInView } from "@/components/EntranceMotion";
import { PricingPlansGrid } from "@/components/PricingPlansGrid";

export function PricingSection({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <>
      <MoveInView from="bottom" delayMs={0} durationMs={780} className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pricing</h2>
        <p className="max-w-2xl text-muted-foreground">
          Start free. Paid plans are loaded from Paddle — same catalog you manage in the dashboard.
        </p>
      </MoveInView>

      <PricingPlansGrid signedIn={signedIn} className="mt-10" />
    </>
  );
}
