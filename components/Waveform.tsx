"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function Waveform({
  isAnimating,
  active,
  className,
  bars = 18,
}: {
  isAnimating?: boolean;
  active?: boolean;
  className?: string;
  bars?: number;
}) {
  const animating = isAnimating ?? active ?? false;
  const items = React.useMemo(() => Array.from({ length: bars }, (_, i) => i), [bars]);

  return (
    <div
      className={cn(
        "flex h-10 w-full items-end justify-between gap-1 rounded-xl border border-border bg-muted/40 px-3 py-2",
        className
      )}
      aria-label={animating ? "Recording waveform" : "Waveform preview"}
    >
      {items.map((i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 rounded-full bg-foreground/70",
            animating ? "animate-wave" : ""
          )}
          style={{
            height: `${animating ? 8 : 12 + (i % 5) * 5}px`,
            animationDelay: `${(i % 9) * 110}ms`,
          }}
        />
      ))}
    </div>
  );
}

