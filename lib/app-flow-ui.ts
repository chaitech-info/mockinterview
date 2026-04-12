import { cn } from "@/lib/utils";

/** Primary pill CTA — matches landing Framer-style buttons */
export const appFlowPrimaryButtonClass =
  "h-12 rounded-full bg-[#1a1615] px-6 text-base font-semibold text-white shadow-sm transition-all duration-300 hover:bg-[#1a1615]/90 hover:shadow-md active:scale-[0.98]";

/** Secondary / outline pill */
export const appFlowSecondaryPillClass =
  "h-12 rounded-full border border-[#e4e2e2] bg-[#f4f1ee] px-6 text-base font-semibold text-foreground shadow-sm transition-all duration-300 hover:bg-[#f1ebe5] hover:shadow-md active:scale-[0.98]";

/** Main elevated surface for flow pages */
export const appFlowSurfaceCard =
  "rounded-3xl border border-[#e4e2e2] bg-card/90 shadow-[0_8px_40px_-16px_rgba(26,22,21,0.08)] backdrop-blur-sm";

/** Wide report / interview outer panel */
export const appFlowPanelClass =
  "rounded-[28px] border border-[#e4e2e2] bg-white/75 p-5 shadow-[0_24px_80px_-40px_rgba(26,22,21,0.12)] backdrop-blur-md sm:p-8";

export function appFlowMainClassName(narrow?: boolean) {
  return cn(
    "mx-auto w-full px-4 py-8 sm:px-6 sm:py-12 md:py-14",
    narrow ? "max-w-2xl" : "max-w-[1072px]"
  );
}

/** Dashboard / wide tables — still matches horizontal padding rhythm */
export const appFlowWideMainClassName =
  "mx-auto w-full min-w-0 max-w-[min(100%,1200px)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8";
