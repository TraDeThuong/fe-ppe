"use client";

import { Check, CheckCircle2, Clock, ShieldAlert, XCircle } from "lucide-react";
import type { IncidentStatus } from "@/types";

export interface IncidentLifecycleStepperProps {
  status: IncidentStatus | string;
}

export function IncidentLifecycleStepper({ status }: IncidentLifecycleStepperProps) {
  const isDismissed = status === "DISMISSED";

  const steps = [
    { key: "DETECTED", label: "Phát hiện AI" },
    { key: "REVIEWED", label: "Thẩm duyệt" },
    { key: "RESOLVING", label: "Điều phối" },
    { key: "RESOLVED", label: "Đã khắc phục" },
    { key: "CLOSED", label: "Nghiệm thu đóng" },
  ];

  const getStepState = (index: number) => {
    if (isDismissed) {
      if (index === 0) return "completed";
      if (index === 1) return "dismissed";
      return "inactive";
    }

    const statusWeights: Record<string, number> = {
      PENDING_REVIEW: 0,
      CONFIRMED: 1,
      RESOLVING: 2,
      RESOLVED: 3,
      CLOSED: 4,
    };

    const currentWeight = statusWeights[status] ?? 0;
    if (index < currentWeight) return "completed";
    if (index === currentWeight) return "current";
    return "inactive";
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm">
      <div className="relative flex items-center justify-between">
        {/* Background Connecting Line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-border/40 -z-0" />

        {steps.map((step, idx) => {
          const state = getStepState(idx);

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition shadow-sm ${
                  state === "completed"
                    ? "bg-primary text-primary-foreground shadow-primary/30"
                    : state === "current"
                    ? "border-2 border-primary bg-surface text-primary shadow-nm-inset animate-pulse"
                    : state === "dismissed"
                    ? "bg-muted text-muted-foreground"
                    : "border border-border/60 bg-surface text-muted-foreground"
                }`}
              >
                {state === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : state === "dismissed" ? (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[11px] font-semibold tracking-tight text-center ${
                  state === "current"
                    ? "text-primary"
                    : state === "completed"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
