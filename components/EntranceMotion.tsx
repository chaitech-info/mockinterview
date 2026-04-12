"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function translateHidden(from: "bottom" | "top" | "left" | "right"): string {
  switch (from) {
    case "top":
      return "-translate-y-8";
    case "left":
      return "-translate-x-12";
    case "right":
      return "translate-x-12";
    case "bottom":
    default:
      return "translate-y-12";
  }
}

export type MoveInProps = {
  children: React.ReactNode;
  className?: string;
  /** Wait after first paint before animating (stagger) */
  delayMs?: number;
  durationMs?: number;
  from?: "bottom" | "top" | "left" | "right";
  /** Slight zoom from slightly smaller */
  withScale?: boolean;
  as?: React.ElementType;
};

/**
 * Slides/fades content into place on mount (after one frame so the browser shows the initial state).
 */
export function MoveIn({
  children,
  className,
  delayMs = 0,
  durationMs = 820,
  from = "bottom",
  withScale = false,
  as: Comp = "div",
}: MoveInProps) {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = React.useState(reduced);

  React.useLayoutEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }

    let timeoutId: number | undefined;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        timeoutId = window.setTimeout(() => setVisible(true), delayMs);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [delayMs, reduced]);

  return (
    <Comp
      className={cn(
        reduced ? "" : "transition-[opacity,transform] motion-reduce:transition-none",
        visible
          ? "translate-x-0 translate-y-0 opacity-100"
          : cn("opacity-0", translateHidden(from), withScale && "scale-[0.96]"),
        visible && withScale && "scale-100",
        className
      )}
      style={
        reduced
          ? undefined
          : {
              transitionDuration: `${durationMs}ms`,
              transitionTimingFunction: EASE,
            }
      }
    >
      {children}
    </Comp>
  );
}

export type MoveInViewProps = Omit<MoveInProps, "as"> & {
  /** Intersection threshold */
  threshold?: number;
  rootMargin?: string;
};

/**
 * Same motion as MoveIn, but starts when the element scrolls into view.
 */
export function MoveInView({
  children,
  className,
  delayMs = 0,
  durationMs = 780,
  from = "bottom",
  withScale = false,
  threshold = 0.12,
  // Positive bottom margin extends the root downward so reveals start slightly before entering the viewport.
  rootMargin = "0px 0px 18% 0px",
}: MoveInViewProps) {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = React.useState(reduced);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) {
          window.setTimeout(() => setVisible(true), delayMs);
          io.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [delayMs, reduced, threshold, rootMargin]);

  return (
    <div
      ref={ref}
      className={cn(
        reduced ? "" : "transition-[opacity,transform] motion-reduce:transition-none",
        visible
          ? "translate-x-0 translate-y-0 opacity-100"
          : cn("opacity-0", translateHidden(from), withScale && "scale-[0.97]"),
        visible && withScale && "scale-100",
        className
      )}
      style={
        reduced
          ? undefined
          : {
              transitionDuration: `${durationMs}ms`,
              transitionTimingFunction: EASE,
            }
      }
    >
      {children}
    </div>
  );
}
