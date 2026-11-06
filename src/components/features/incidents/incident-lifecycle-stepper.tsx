"use client";

import { Check, XCircle, MousePointerClick } from "lucide-react";
import type { IncidentStatus } from "@/types";

export interface IncidentLifecycleStepperProps {
  status: IncidentStatus | string;
  hasAssignments?: boolean;
  onStepClick?: (stepKey: string) => void;
}

export function IncidentLifecycleStepper({
  status,
  hasAssignments = false,
  onStepClick,
}: IncidentLifecycleStepperProps) {
  const isDismissed = status === "DISMISSED";

  const steps = [
    { key: "DETECTED", label: "Phát hiện AI" },
    { key: "REVIEWED", label: "Thẩm duyệt" },
    { key: "RESOLVING", label: "Điều phối" },
    { key: "RESOLVED", label: "Đã khắc phục" },
    { key: "CLOSED", label: "Nghiệm thu đóng" },
  ];

  // Tính toán trọng số bước chính xác
  let currentWeight = 1;
  if (status === "PENDING_REVIEW") {
    currentWeight = 1;
  } else if (status === "CONFIRMED") {
    currentWeight = hasAssignments ? 3 : 2;
  } else if (status === "RESOLVED") {
    currentWeight = 4;
  } else if (status === "CLOSED") {
    currentWeight = 5;
  }

  const getStepState = (index: number) => {
    if (isDismissed) {
      if (index === 0) return "completed";
      if (index === 1) return "dismissed";
      return "inactive";
    }

    if (index < currentWeight) return "completed";
    if (index === currentWeight) return "current";

    return "inactive";
  };

  const progressPercentage = isDismissed
    ? 25
    : Math.min(100, Math.max(0, (Math.min(currentWeight, 4) / 4) * 100));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-surface p-4 shadow-[5px_5px_12px_rgba(0,0,0,0.07),-5px_-5px_12px_rgba(255,255,255,0.65)] dark:shadow-[5px_5px_12px_rgba(0,0,0,0.22),-4px_-4px_10px_rgba(255,255,255,0.025)]">
      {/* Inner recessed track */}
      <div className="relative rounded-xl bg-surface/50 px-2 py-3 shadow-[inset_3px_3px_7px_rgba(0,0,0,0.07),inset_-3px_-3px_7px_rgba(255,255,255,0.6)] dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2),inset_-2px_-2px_6px_rgba(255,255,255,0.025)]">
        <div className="relative flex items-start justify-between">
          {/* Recessed connecting rail */}
          <div className="absolute left-[10%] right-[10%] top-[18px] h-[5px] -translate-y-1/2 overflow-hidden rounded-full bg-border/40 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.14),inset_-1px_-1px_2px_rgba(255,255,255,0.5)]">
            {/* Progress fill */}
            {!isDismissed && (
              <div
                className="h-full rounded-full bg-primary shadow-[0_0_5px_rgba(0,0,0,0.12)] transition-all duration-500"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            )}
          </div>

          {steps.map((step, idx) => {
            const state = getStepState(idx);
            const isClickable = state === "current" && Boolean(onStepClick);

            return (
              <div
                key={step.key}
                onClick={() => {
                  if (isClickable && onStepClick) {
                    onStepClick(step.key);
                  }
                }}
                className={`
                  relative z-10 flex min-w-0 flex-1 flex-col items-center gap-2
                  ${isClickable ? "cursor-pointer group" : ""}
                `}
                title={
                  isClickable
                    ? `Bấm để thực hiện bước: ${step.label}`
                    : undefined
                }
              >
                {/* 3D Step Indicator */}
                <div
                  className={`
                    relative flex h-9 w-9 shrink-0 items-center justify-center
                    rounded-full text-xs font-bold
                    transition-all duration-300
                    ${
                      state === "completed"
                        ? `
                          bg-primary text-primary-foreground
                          shadow-[3px_3px_6px_rgba(0,0,0,0.17),-2px_-2px_5px_rgba(255,255,255,0.55),inset_1px_1px_2px_rgba(255,255,255,0.18)]
                          dark:shadow-[3px_3px_6px_rgba(0,0,0,0.3),-2px_-2px_4px_rgba(255,255,255,0.04)]
                        `
                        : state === "current"
                        ? `
                          border-[2px] border-primary
                          bg-surface text-primary
                          animate-gentle-pulse-ring
                          group-hover:scale-110 group-active:scale-95
                          shadow-[inset_3px_3px_6px_rgba(0,0,0,0.12),inset_-3px_-3px_6px_rgba(255,255,255,0.7),0_0_0_3px_rgba(163,81,57,0.15)]
                          dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.25),inset_-2px_-2px_5px_rgba(255,255,255,0.04),0_0_0_3px_rgba(255,177,98,0.2)]
                        `
                        : state === "dismissed"
                        ? `
                          border border-border/50 bg-muted text-muted-foreground
                          shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.55)]
                          dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.025)]
                        `
                        : `
                          border border-border/40 bg-surface text-muted-foreground
                          shadow-[2px_2px_5px_rgba(0,0,0,0.08),-2px_-2px_5px_rgba(255,255,255,0.65)]
                          dark:shadow-[2px_2px_5px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.025)]
                        `
                    }
                  `}
                >
                  {state === "completed" ? (
                    <Check className="h-4 w-4 stroke-[2.8]" />
                  ) : state === "dismissed" ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}

                  {/* Highlight on raised/current surfaces */}
                  {(state === "completed" || state === "current") && (
                    <span className="pointer-events-none absolute inset-[2px] rounded-full border border-white/15" />
                  )}
                </div>

                {/* Step label */}
                <span
                  className={`
                    max-w-[76px] text-center text-[10px] font-semibold
                    leading-[1.35] tracking-tight
                    transition-colors duration-300
                    ${
                      state === "current"
                        ? "text-primary font-bold group-hover:underline"
                        : state === "completed"
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  `}
                >
                  {step.label}
                </span>

                {/* Current step indicator tag */}
                {state === "current" && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-[3px] w-5 rounded-full bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.16)]" />
                    {isClickable && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.2 font-mono text-[8px] font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <MousePointerClick className="h-2 w-2" />
                        <span>Bấm xử lý</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
