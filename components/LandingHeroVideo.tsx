"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** Same file as `<source src=…>` — bump `HERO_VIDEO_CACHE_VERSION` if this changes. */
const HERO_DEMO_VIDEO_SRC = "/videos/0412.mp4" as const;
const HERO_VIDEO_USER_CACHE_KEY = "interviewlab:hero-demo-video";
const HERO_VIDEO_CACHE_VERSION = 1 as const;

type HeroVideoUserCachePayload = {
  v: typeof HERO_VIDEO_CACHE_VERSION;
  src: typeof HERO_DEMO_VIDEO_SRC;
  loadedAt: number;
};

function writeHeroVideoUserCache(): void {
  if (typeof window === "undefined") return;
  try {
    const payload: HeroVideoUserCachePayload = {
      v: HERO_VIDEO_CACHE_VERSION,
      src: HERO_DEMO_VIDEO_SRC,
      loadedAt: Date.now(),
    };
    localStorage.setItem(HERO_VIDEO_USER_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota
  }
}

function clearHeroVideoUserCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HERO_VIDEO_USER_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

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

function VideoSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[2] flex min-h-full w-full flex-col gap-3 overflow-hidden rounded-[20px] bg-[#ebe8e4] p-4 sm:rounded-[24px] sm:p-5",
        className
      )}
      aria-hidden
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="h-3 w-1/3 max-w-[140px] animate-pulse rounded-md bg-[#d8d4cf]" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-[#d8d4cf]" />
      </div>
      <div className="flex min-h-0 flex-1 items-end justify-between gap-1 px-1 pb-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-full max-w-[5px] animate-pulse rounded-full bg-[#d0ccc6]"
            style={{
              height: `${22 + ((i * 13) % 55)}%`,
              animationDelay: `${(i % 6) * 120}ms`,
            }}
          />
        ))}
      </div>
      <div className="flex justify-center">
        <div className="h-2 w-24 animate-pulse rounded-full bg-[#d8d4cf]" />
      </div>
    </div>
  );
}

/**
 * Hero demo video: starts tilted (3D) at the bottom of the hero, flattens and scales up while scrolling — Framer-style.
 */
export function LandingHeroVideo({ className }: { className?: string }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = React.useState(0);
  const [entered, setEntered] = React.useState(false);
  /** Overlay until first frame / playable — do not tie to localStorage (that hid the video while browsers stalled decode behind opacity-0). */
  const [showSkeleton, setShowSkeleton] = React.useState(true);
  const cacheWriteDoneRef = React.useRef(false);
  const reduced = usePrefersReducedMotion();

  const onHeroVideoLoaded = React.useCallback(() => {
    setShowSkeleton(false);
    if (!cacheWriteDoneRef.current) {
      cacheWriteDoneRef.current = true;
      writeHeroVideoUserCache();
    }
  }, []);

  /** Muted autoplay: nudge play() after mount (some WebKit builds need it when overlay was covering). */
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    void v.play().catch(() => {});
  }, []);

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
          className="relative overflow-hidden rounded-[20px] border border-[#e4e2e2] bg-[#f4f1ee] sm:rounded-[24px]"
          style={{
            boxShadow: `0 ${22 + 36 * p}px ${72 + 56 * p}px -${26 + 14 * p}px rgba(26, 22, 21, ${0.14 + 0.1 * p})`,
          }}
        >
          <div className="relative isolate min-h-[min(42vh,320px)] w-full sm:min-h-[min(48vh,380px)] md:min-h-[min(52vh,420px)]">
            <video
              ref={videoRef}
              className="relative z-[1] mx-auto block max-h-[min(58vh,480px)] w-full object-contain sm:max-h-[min(64vh,560px)] md:max-h-[min(68vh,600px)]"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label="Mock Interview — see the product in action"
              onLoadedData={onHeroVideoLoaded}
              onCanPlay={onHeroVideoLoaded}
              onCanPlayThrough={onHeroVideoLoaded}
              onError={() => {
                clearHeroVideoUserCache();
                cacheWriteDoneRef.current = false;
                setShowSkeleton(false);
              }}
              onEnded={(e) => {
                const el = e.currentTarget;
                el.currentTime = 0;
                void el.play().catch(() => {});
              }}
            >
              <source src={HERO_DEMO_VIDEO_SRC} type="video/mp4" />
            </video>
            {showSkeleton ? <VideoSkeleton /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
