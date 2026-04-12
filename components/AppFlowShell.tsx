"use client";

import * as React from "react";

/**
 * Shared backdrop for /app/* flows — aligns with the marketing page (soft orbs, warm background).
 */
export function AppFlowShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-14%] h-[min(75vw,560px)] w-[min(75vw,560px)] -translate-x-1/2 rounded-full bg-[hsl(var(--framer-blue-glow))] opacity-[0.2] blur-[96px]" />
        <div className="absolute bottom-[-10%] right-[-6%] h-[min(60vw,420px)] w-[min(60vw,420px)] rounded-full bg-[#f4e6da]/65 blur-[84px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_-8%,rgba(132,185,239,0.06),transparent)]" />
      </div>
      {children}
    </div>
  );
}
