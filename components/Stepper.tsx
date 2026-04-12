"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type Step = {
  id: 1 | 2 | 3;
  label: string;
};

const steps: Step[] = [
  { id: 1, label: "Job description" },
  { id: 2, label: "Mock interview" },
  { id: 3, label: "Your report" },
];

export function Stepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="w-full rounded-2xl border border-[#e4e2e2] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5">
      <ol className="grid grid-cols-3 gap-3 sm:gap-8">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <li key={step.id} className="flex min-w-0 flex-col items-center gap-2.5 text-center sm:items-stretch sm:text-left">
              <div className="flex justify-center sm:justify-start">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-300",
                    (isCompleted || isActive) &&
                      "border-[#1a1615] bg-[#1a1615] text-white shadow-sm",
                    !isCompleted && !isActive && "border-[#e4e2e2] bg-[#faf8f6] text-muted-foreground"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : step.id}
                </div>
              </div>

              <div className="w-full min-w-0 space-y-2">
                <div
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.08em] sm:text-sm sm:normal-case sm:tracking-normal",
                    (isActive || isCompleted) && "text-foreground",
                    !isCompleted && !isActive && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[#eae6e2]">
                  <div
                    className={cn(
                      "h-full rounded-full bg-[#1a1615] transition-[width] duration-500 ease-out",
                      !isCompleted && !isActive && "opacity-40"
                    )}
                    style={{
                      width: isCompleted ? "100%" : isActive ? "62%" : "0%",
                    }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
