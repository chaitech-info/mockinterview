"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function Waveform({
  isAnimating,
  active,
  className,
  bars = 20,
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
        "relative w-full overflow-hidden rounded-2xl border border-[#e4e2e2] bg-gradient-to-b from-[#f4f0eb]/90 via-white to-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,rgba(132,185,239,0.07),transparent_65%)]",
        className
      )}
      aria-label={animating ? "Recording waveform" : "Waveform preview"}
      role="img"
    >
      <div className="relative flex h-[4.75rem] w-full max-w-full items-end gap-0.5 px-2.5 py-3 sm:h-[5.5rem] sm:gap-1 sm:px-4 sm:py-4">
        {items.map((i) => {
          const staticPct = 26 + ((i * 17 + (i % 5) * 13) % 54);
          return (
            <div
              key={i}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
              aria-hidden
            >
              <div
                className={cn(
                  "mx-auto w-full max-w-[6px] min-h-[4px] rounded-full transition-colors duration-300",
                  animating
                    ? "animate-wave bg-[#1a1615]/85"
                    : "bg-[#1a1615]/[0.38]"
                )}
                style={{
                  height: animating ? "2.75rem" : `${staticPct}%`,
                  animationDelay: `${(i % 9) * 110}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
