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
    <div className="w-full">
      <ol className="grid grid-cols-3 gap-3">
        {steps.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <li key={step.id} className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  isCompleted && "border-border bg-background text-foreground",
                  isActive && "border-border bg-background text-foreground",
                  !isCompleted && !isActive && "border-border bg-background text-muted-foreground"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </div>

              <div className="min-w-0">
                <div
                  className={cn(
                    "truncate text-sm font-medium",
                    (isActive || isCompleted) && "text-foreground",
                    !isCompleted && !isActive && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </div>
                <div className="mt-2 hidden h-1 w-full overflow-hidden rounded-full bg-muted sm:block">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      (isCompleted || isActive) && "bg-foreground",
                      !isCompleted && !isActive && "bg-muted-foreground/20"
                    )}
                    style={{
                      width: isCompleted ? "100%" : isActive ? "60%" : "0%",
                    }}
                  />
                </div>
              </div>

              {idx < steps.length - 1 ? (
                <div className="hidden h-px flex-1 bg-border sm:block" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

