"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/firebase/client";
import {
  openPaddleCheckout,
  type PaddleCheckoutEnvironment,
  type PaddleKeyMode,
} from "@/lib/paddle/checkout";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function PricingCard({
  title,
  price,
  description,
  features,
  highlighted,
  ctaLabel,
  ctaHref,
  ctaGoogleSignIn,
  paddlePriceId,
  paddleCheckoutEnvironment,
  paddleKeyMode,
}: {
  title: string;
  price: string;
  description?: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  ctaHref: string;
  /** When true, CTA starts Google sign-in and uses `ctaHref` as the post-login path. */
  ctaGoogleSignIn?: boolean;
  /** If set, opens Paddle overlay checkout for this Billing price (pri_…). */
  paddlePriceId?: string;
  /** Aligns Paddle.js with the server key that listed this price (sandbox vs live). */
  paddleCheckoutEnvironment?: PaddleCheckoutEnvironment;
  /** From `/api/paddle/prices` — refines JWT / token mismatch hints. */
  paddleKeyMode?: PaddleKeyMode;
}) {
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);

  const usePaddle = Boolean(paddlePriceId?.trim());

  async function handlePaddleCheckout() {
    if (!paddlePriceId?.trim()) return;
    setCheckoutLoading(true);
    try {
      void track("paddle_checkout_open", { priceId: paddlePriceId });
      await openPaddleCheckout(paddlePriceId, paddleCheckoutEnvironment, {
        paddleKeyMode,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout could not start.";
      window.alert(msg);
      void track("paddle_checkout_error", { message: msg });
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <Card
      className={cn(
        "relative h-full overflow-hidden",
        highlighted
          ? "border-border shadow-md ring-1 ring-border"
          : "border-border shadow-sm"
      )}
    >
      {highlighted ? (
        <div className="absolute right-4 top-4">
          <Badge className="bg-foreground text-background hover:bg-foreground">Recommended</Badge>
        </div>
      ) : null}
      <CardHeader className="space-y-3">
        <CardTitle className="text-xl">{title}</CardTitle>
        <div className="flex items-end gap-2">
          <div className="text-4xl font-semibold tracking-tight">{price}</div>
          {price !== "$0" && !/[\/]/.test(price) ? (
            <div className="pb-1 text-sm text-muted-foreground">per month</div>
          ) : null}
        </div>
        {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-foreground" />
              <span className="text-foreground">{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {usePaddle ? (
          <Button
            type="button"
            className="w-full"
            variant={highlighted ? "default" : "outline"}
            disabled={checkoutLoading}
            onClick={() => void handlePaddleCheckout()}
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening checkout…
              </>
            ) : (
              ctaLabel
            )}
          </Button>
        ) : ctaGoogleSignIn ? (
          <Button
            type="button"
            className="w-full"
            variant={highlighted ? "default" : "outline"}
            onClick={() => {
              void track("pricing_click_try_free_google");
              void signInWithGoogle(ctaHref);
            }}
          >
            {ctaLabel}
          </Button>
        ) : (
          <Button asChild className="w-full" variant={highlighted ? "default" : "outline"}>
            <a href={ctaHref}>{ctaLabel}</a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
