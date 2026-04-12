import * as React from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuestionCard({
  title = "Question",
  question,
  children,
  className,
}: {
  title?: string;
  question: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-3xl border border-[#e4e2e2] bg-card/90 shadow-[0_8px_40px_-16px_rgba(26,22,21,0.08)] backdrop-blur-sm",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-pretty text-lg font-semibold leading-snug sm:text-xl">
          {question}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

