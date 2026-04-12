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

  const gridLayoutClass = loading
    ? cn("grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3", gridClassName)
    : cn(colClass, gridClassName);

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

      {loading ? (
        <p className="mb-4 text-sm text-muted-foreground" role="status" aria-live="polite">
          Loading plans and prices…
        </p>
      ) : null}

      <div className={gridLayoutClass}>
        <MoveInView from="bottom" delayMs={0} withScale>
          <PricingCard
            title="Free"
            price="$0"
            features={[
              "1 free mock interview to start",
              "3 questions per interview",
              "No PDF report",
            ]}
            ctaLabel={signedIn ? "Get started" : "Try free"}
            ctaHref="/app/intake"
            ctaGoogleSignIn={!signedIn}
          />
        </MoveInView>

        {loading
          ? [0, 1, 2].map((i) => (
              <MoveInView key={i} from="bottom" delayMs={90 + i * 100} withScale>
                <Card
                  className={cn(
                    "h-full overflow-hidden rounded-3xl border border-[#e4e2e2] bg-white/80 shadow-[0_8px_40px_-16px_rgba(26,22,21,0.08)] backdrop-blur-sm"
                  )}
                  aria-hidden
                >
                  <CardContent className="space-y-5 p-6">
                    <div className="h-5 w-32 animate-pulse rounded-lg bg-[#e4e2e2]/95" />
                    <div className="flex items-end gap-2 pt-0.5">
                      <div className="h-10 w-28 animate-pulse rounded-lg bg-[#e4e2e2]/90" />
                      <div
                        className="mb-1 h-3.5 w-14 animate-pulse rounded-full bg-[#dcd8d4]"
                        style={{ animationDelay: `${i * 80}ms` }}
                      />
                    </div>
                    <div className="space-y-3 border-t border-[#e4e2e2]/60 pt-4">
                      {[0, 1, 2, 3, 4].map((row) => (
                        <div key={row} className="flex items-start gap-2.5">
                          <div
                            className="mt-0.5 h-4 w-4 shrink-0 animate-pulse rounded-full bg-[#e4e2e2]/85"
                            style={{ animationDelay: `${(i * 5 + row) * 60}ms` }}
                          />
                          <div
                            className={cn(
                              "h-3.5 animate-pulse rounded-full bg-[#e4e2e2]/75",
                              row === 2 ? "w-[82%]" : "w-full"
                            )}
                            style={{ animationDelay: `${(i * 5 + row) * 60 + 40}ms` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div
                      className="h-11 w-full animate-pulse rounded-full bg-[#e4e2e2]/80"
                      style={{ animationDelay: `${120 + i * 100}ms` }}
                    />
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
                  priceCaption="One-time"
                  highlighted={idx === items.length - 1 && items.length > 0}
                  features={plan.features}
                  ctaLabel="Buy credits"
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
