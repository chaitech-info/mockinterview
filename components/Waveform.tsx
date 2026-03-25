"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function Waveform({
  active,
  className,
  bars = 18,
}: {
  active?: boolean;
  className?: string;
  bars?: number;
}) {
  const items = React.useMemo(() => Array.from({ length: bars }, (_, i) => i), [bars]);

  return (
    <div
      className={cn(
        "flex h-10 w-full items-end justify-between gap-1 rounded-xl border border-border bg-muted/40 px-3 py-2",
        className
      )}
      aria-label={active ? "Recording waveform" : "Waveform preview"}
    >
      {items.map((i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 rounded-full bg-foreground/70",
            active ? "animate-wave" : ""
          )}
          style={{
            height: `${active ? 8 : 12 + (i % 5) * 5}px`,
            animationDelay: `${(i % 9) * 110}ms`,
          }}
        />
      ))}
    </div>
  );
}

