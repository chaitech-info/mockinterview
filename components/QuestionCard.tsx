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
    <Card className={cn("shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground">{title}</CardTitle>
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

