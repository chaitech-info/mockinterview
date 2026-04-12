"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Hero demo video: starts tilted (3D) at the bottom of the hero, flattens and scales up while scrolling — Framer-style.
 */
export function LandingHeroVideo({ className }: { className?: string }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = React.useState(0);
  const [entered, setEntered] = React.useState(false);
  const reduced = usePrefersReducedMotion();

  React.useLayoutEffect(() => {
    if (reduced) {
      setEntered(true);
      return;
    }
    const t = window.setTimeout(() => setEntered(true), 320);
    return () => window.clearTimeout(t);
  }, [reduced]);

  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Narrower start→end range = animation completes with less scroll (snappier than before).
      const start = vh * 0.82;
      const end = vh * 0.36;
      const raw = (start - rect.top) / (start - end);
      setProgress(Math.min(1, Math.max(0, raw)));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const p = reduced ? 1 : progress;

  const rotateX = 18 * (1 - p);
  const scale = 0.78 + 0.22 * p;
  const translateY = 56 * (1 - p);

  return (
    <div
      ref={trackRef}
      className={cn(
        "w-full pt-0",
        !reduced && "transition-opacity duration-700",
        entered ? "opacity-100" : "opacity-0",
        className
      )}
      style={
        !reduced
          ? { transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }
          : undefined
      }
    >
      <div
        className="mx-auto w-full max-w-full will-change-transform [transform-style:preserve-3d] [backface-visibility:hidden]"
        style={{
          transform: `perspective(1500px) rotateX(${rotateX}deg) scale(${scale}) translateY(${translateY}px)`,
          transformOrigin: "center bottom",
        }}
      >
        <div
          className="overflow-hidden rounded-[20px] border border-[#e4e2e2] bg-[#f4f1ee] sm:rounded-[24px]"
          style={{
            boxShadow: `0 ${22 + 36 * p}px ${72 + 56 * p}px -${26 + 14 * p}px rgba(26, 22, 21, ${0.14 + 0.1 * p})`,
          }}
        >
          <video
            ref={videoRef}
            className="mx-auto block max-h-[min(58vh,480px)] w-full object-contain sm:max-h-[min(64vh,560px)] md:max-h-[min(68vh,600px)]"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="Mock Interview — see the product in action"
            onEnded={(e) => {
              const v = e.currentTarget;
              v.currentTime = 0;
              void v.play().catch(() => {});
            }}
          >
            <source src="/videos/0412.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  );
}
