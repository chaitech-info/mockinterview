"use client";

import * as React from "react";

import { MoveInView } from "@/components/EntranceMotion";
import { PricingCard } from "@/components/PricingCard";
import { Card, CardContent } from "@/components/ui/card";
import type { PaddleCatalogItem } from "@/lib/paddle/catalog-map";
import type { PaddleCheckoutEnvironment, PaddleKeyMode } from "@/lib/paddle/checkout";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ApiResponse = {
  ok: boolean;
  items?: PaddleCatalogItem[];
  message?: string;
  checkoutEnvironment?: PaddleCheckoutEnvironment;
  paddleKeyMode?: PaddleKeyMode;
};

export function PricingPlansGrid({
  signedIn = false,
  className,
  gridClassName,
}: {
  signedIn?: boolean;
  className?: string;
  gridClassName?: string;
}) {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<PaddleCatalogItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [checkoutEnvironment, setCheckoutEnvironment] =
    React.useState<PaddleCheckoutEnvironment | null>(null);
  const [paddleKeyMode, setPaddleKeyMode] = React.useState<PaddleKeyMode | null>(null);
  const [checkoutCustomData, setCheckoutCustomData] = React.useState<
    Record<string, unknown> | undefined
  >();

  /** Keep Paddle `customData.supabase_user_id` in sync whenever auth changes (e.g. sign-in on landing). */
  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCheckoutCustomData(undefined);
      return;
    }
    function syncCustomData() {
      void getCurrentUser().then((user) => {
        if (!user) {
          setCheckoutCustomData(undefined);
          return;
        }
        const next: Record<string, unknown> = { supabase_user_id: user.id };
        if (user.email) next.email = user.email;
        setCheckoutCustomData(next);
      });
    }

    syncCustomData();

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncCustomData();
    });
    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/paddle/prices", { cache: "no-store" });
        const data = (await res.json()) as ApiResponse;
        if (cancelled) return;
        if (data.checkoutEnvironment === "sandbox" || data.checkoutEnvironment === "production") {
          setCheckoutEnvironment(data.checkoutEnvironment);
        }
        if (
          data.paddleKeyMode === "live" ||
          data.paddleKeyMode === "sandbox" ||
          data.paddleKeyMode === "unknown"
        ) {
          setPaddleKeyMode(data.paddleKeyMode);
        }
        if (data.ok && Array.isArray(data.items)) {
          setItems(data.items);
        } else {
          setError(data.message ?? "Could not load pricing.");
        }
      } catch {
        if (!cancelled) setError("Could not load pricing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const colClass =
    items.length >= 2
      ? "grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3"
      : items.length === 1
        ? "grid gap-4 sm:gap-6 md:grid-cols-2"
        : "grid gap-4 sm:gap-6";

  return (
    <div className={cn(className)}>
      {error && !loading ? (
        <MoveInView from="bottom" delayMs={0} className="mb-4">
          <p className="text-sm text-muted-foreground">
            {error} Add <code className="rounded bg-muted px-1 py-0.5 text-xs">PADDLE_API_KEY</code> in
            Vercel (server-side API key from Paddle → Developer tools) and redeploy.
          </p>
        </MoveInView>
      ) : null}

      <div className={cn(colClass, gridClassName)}>
        <MoveInView from="bottom" delayMs={0} withScale>
          <PricingCard
            title="Free"
            price="$0"
            features={["1 mock interview/month", "3 questions per interview", "No PDF report"]}
            ctaLabel={signedIn ? "Get started" : "Try free"}
            ctaHref="/app/intake"
            ctaGoogleSignIn={!signedIn}
          />
        </MoveInView>

        {loading
          ? [0, 1].map((i) => (
              <MoveInView key={i} from="bottom" delayMs={90 + i * 100} withScale>
                <Card className="h-full animate-pulse border-border">
                  <CardContent className="p-6">
                    <div className="h-5 w-24 rounded bg-muted" />
                    <div className="mt-4 h-10 w-32 rounded bg-muted" />
                    <div className="mt-6 space-y-2">
                      <div className="h-4 w-full rounded bg-muted" />
                      <div className="h-4 w-full rounded bg-muted" />
                      <div className="h-4 w-11/12 rounded bg-muted" />
                    </div>
                    <div className="mt-8 h-10 w-full rounded bg-muted" />
                  </CardContent>
                </Card>
              </MoveInView>
            ))
          : items.map((plan, idx) => (
              <MoveInView
                key={plan.priceId}
                from="bottom"
                delayMs={90 + idx * 100}
                withScale
              >
                <PricingCard
                  title={plan.title}
                  price={plan.priceDisplay}
                  highlighted={idx === items.length - 1 && items.length > 0}
                  features={plan.features}
                  ctaLabel="Subscribe"
                  ctaHref="/app/intake"
                  paddlePriceId={plan.priceId}
                  paddleCheckoutEnvironment={checkoutEnvironment ?? undefined}
                  paddleKeyMode={paddleKeyMode ?? undefined}
                  checkoutCustomData={checkoutCustomData}
                />
              </MoveInView>
            ))}
      </div>
    </div>
  );
}
