"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { AuthButton } from "@/components/AuthButton";
import { MoveIn } from "@/components/EntranceMotion";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/firebase/client";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { cn } from "@/lib/utils";

const framerPillButtonPrimary =
  "h-12 rounded-full bg-[#1a1615] px-6 text-base font-semibold text-white shadow-sm transition-all duration-300 hover:bg-[#1a1615]/90 hover:shadow-md active:scale-[0.98]";

function closeMobileMenu(
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
  onNavigate?: () => void
) {
  onNavigate?.();
  setOpen(false);
}

export function LandingNavBar() {
  const authSession = useAuthSession();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const navButtonClass =
    "w-full justify-start rounded-xl px-3 py-2.5 text-left text-sm font-medium md:w-auto md:justify-center md:rounded-full md:px-3 md:py-2";

  return (
    <MoveIn from="top" delayMs={0} durationMs={720} className="w-full">
      <div className="rounded-[20px] border border-[#e4e2e2] bg-white/90 shadow-[0_8px_40px_-12px_rgba(26,22,21,0.1)] backdrop-blur-xl md:rounded-full">
        <div className="flex min-h-12 items-center justify-between gap-2 px-3 py-2 sm:min-h-[60px] sm:px-4 sm:py-0">
          <a href="/" className="flex min-w-0 shrink-0 items-center gap-2 pl-0.5 sm:pl-1">
            <Image
              src="/logo.jpeg"
              alt=""
              width={200}
              height={40}
              className="h-8 w-auto max-w-[120px] object-contain object-left sm:h-9 sm:max-w-[180px]"
              priority
            />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">Mock Interview</span>
          </a>

          <nav
            className="hidden min-w-0 items-center justify-end gap-1 md:flex md:gap-2"
            aria-label="Primary"
          >
            <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full text-sm font-medium">
              <a href="#features" onClick={() => void track("landing_click_features")}>
                Features
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full text-sm font-medium">
              <a href="#how-it-works" onClick={() => void track("landing_click_see_how_it_works_nav")}>
                How it works
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full text-sm font-medium">
              <a href="#pricing" onClick={() => void track("landing_click_pricing")}>
                Pricing
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full border-[#e4e2e2] font-semibold"
            >
              <Link href="/app/dashboard" onClick={() => void track("landing_click_dashboard")}>
                Dashboard
              </Link>
            </Button>
            {authSession.status !== "signed_in" ? (
              <Button
                type="button"
                size="sm"
                className={cn(framerPillButtonPrimary, "h-9 px-4 text-sm")}
                onClick={() => {
                  void track("landing_click_try_free");
                  void signInWithGoogle("/app/intake");
                }}
              >
                Try free
              </Button>
            ) : null}
            <div className="shrink-0 pl-0.5 md:pl-1">
              <AuthButton />
            </div>
          </nav>

          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e4e2e2] bg-[#faf8f6] text-foreground shadow-sm transition-colors hover:bg-[#f0ebe4] md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>

        <div
          id="landing-mobile-nav"
          className={cn(
            "border-t border-[#e4e2e2] px-3 py-3 md:hidden",
            mobileOpen ? "block" : "hidden"
          )}
        >
          <div className="flex flex-col gap-1">
            <Button asChild variant="ghost" className={navButtonClass}>
              <a
                href="#features"
                onClick={() => closeMobileMenu(setMobileOpen, () => void track("landing_click_features"))}
              >
                Features
              </a>
            </Button>
            <Button asChild variant="ghost" className={navButtonClass}>
              <a
                href="#how-it-works"
                onClick={() =>
                  closeMobileMenu(setMobileOpen, () => void track("landing_click_see_how_it_works_nav"))
                }
              >
                How it works
              </a>
            </Button>
            <Button asChild variant="ghost" className={navButtonClass}>
              <a href="#pricing" onClick={() => closeMobileMenu(setMobileOpen, () => void track("landing_click_pricing"))}>
                Pricing
              </a>
            </Button>
            <Button asChild variant="outline" className={cn(navButtonClass, "border-[#e4e2e2] font-semibold")}>
              <Link
                href="/app/dashboard"
                onClick={() => closeMobileMenu(setMobileOpen, () => void track("landing_click_dashboard"))}
              >
                Dashboard
              </Link>
            </Button>
            {authSession.status !== "signed_in" ? (
              <Button
                type="button"
                className={cn(framerPillButtonPrimary, "mt-1 h-11 w-full text-sm")}
                onClick={() => {
                  closeMobileMenu(setMobileOpen, () => void track("landing_click_try_free"));
                  void signInWithGoogle("/app/intake");
                }}
              >
                Try free
              </Button>
            ) : null}
            <div className="mt-2 border-t border-[#e4e2e2] pt-3">
              <AuthButton />
            </div>
          </div>
        </div>
      </div>
    </MoveIn>
  );
}
