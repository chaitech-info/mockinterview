import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
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
}: {
  title: string;
  price: string;
  description?: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  ctaHref: string;
}) {
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
          {price !== "$0" ? <div className="pb-1 text-sm text-muted-foreground">per month</div> : null}
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
        <Button asChild className="w-full" variant={highlighted ? "default" : "outline"}>
          <a href={ctaHref}>{ctaLabel}</a>
        </Button>
      </CardFooter>
    </Card>
  );
}

