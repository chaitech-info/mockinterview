"use client";

import * as React from "react";

import { PricingCard } from "@/components/PricingCard";
import type { PaddleCatalogItem } from "@/lib/paddle/catalog-map";
import type { PaddleCheckoutEnvironment, PaddleKeyMode } from "@/lib/paddle/checkout";
import { Card, CardContent } from "@/components/ui/card";

type ApiResponse = {
  ok: boolean;
  items?: PaddleCatalogItem[];
  message?: string;
  checkoutEnvironment?: PaddleCheckoutEnvironment;
  paddleKeyMode?: PaddleKeyMode;
};

export function PricingSection() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<PaddleCatalogItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [checkoutEnvironment, setCheckoutEnvironment] =
    React.useState<PaddleCheckoutEnvironment | null>(null);
  const [paddleKeyMode, setPaddleKeyMode] = React.useState<PaddleKeyMode | null>(null);

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
        if (data.paddleKeyMode === "live" || data.paddleKeyMode === "sandbox" || data.paddleKeyMode === "unknown") {
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
      ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      : items.length === 1
        ? "grid gap-6 md:grid-cols-2"
        : "grid gap-6";

  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pricing</h2>
        <p className="max-w-2xl text-muted-foreground">
          Start free. Paid plans are loaded from Paddle — same catalog you manage in the dashboard.
        </p>
      </div>

      {error && !loading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {error} Add <code className="rounded bg-muted px-1 py-0.5 text-xs">PADDLE_API_KEY</code> in
          Vercel (server-side API key from Paddle → Developer tools) and redeploy.
        </p>
      ) : null}

      <div className={`mt-10 ${colClass}`}>
        <PricingCard
          title="Free"
          price="$0"
          features={["1 session/month", "5 questions", "No PDF report"]}
          ctaLabel="Try free — no signup"
          ctaHref="/app/intake"
        />

        {loading
          ? [0, 1].map((i) => (
              <Card key={i} className="h-full animate-pulse border-border">
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
            ))
          : items.map((plan, idx) => (
              <PricingCard
                key={plan.priceId}
                title={plan.title}
                price={plan.priceDisplay}
                highlighted={idx === items.length - 1 && items.length > 0}
                features={plan.features}
                ctaLabel="Subscribe"
                ctaHref="/app/intake"
                paddlePriceId={plan.priceId}
                paddleCheckoutEnvironment={checkoutEnvironment ?? undefined}
                paddleKeyMode={paddleKeyMode ?? undefined}
              />
            ))}
      </div>
    </>
  );
}
