import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

function scoreTone(score: number) {
  if (score >= 8) return { ring: "ring-border", text: "text-foreground", bg: "bg-background" };
  if (score >= 5) return { ring: "ring-border", text: "text-foreground", bg: "bg-muted" };
  return { ring: "ring-border", text: "text-foreground", bg: "bg-muted/60" };
}

export function ScoreCard({
  label,
  score,
  className,
}: {
  label: string;
  score: number;
  className?: string;
}) {
  const tone = scoreTone(score);

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardContent className="p-5">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <div className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1", tone.bg, tone.text, tone.ring)}>
            {score.toFixed(1)}/10
          </div>
          <div className="text-xs text-muted-foreground">Score</div>
        </div>
      </CardContent>
    </Card>
  );
}

