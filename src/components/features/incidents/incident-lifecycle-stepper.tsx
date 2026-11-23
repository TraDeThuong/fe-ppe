"use client";

import type { ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  CheckSquare,
  FileCheck2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentStatus } from "@/types";

export interface IncidentLifecycleStepperProps {
  status: IncidentStatus | string;
  hasAssignments?: boolean;
  assignedOfficerName?: string;
  awaitingDispatch?: boolean;
  onStepClick?: (stepKey: string) => void;
  onReview?: () => void;
  onAssign?: () => void;
  onResolve?: () => void;
  onClose?: () => void;
}

type StripTone = "primary" | "emerald" | "slate" | "muted";

interface GuideConfig {
  tone: StripTone;
  icon: ReactNode;
  pulse?: boolean;
  stepTag: string;
  metaTag?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function IncidentLifecycleStepper({
  status,
  hasAssignments = false,
  assignedOfficerName,
  awaitingDispatch = false,
  onStepClick,
  onReview,
  onAssign,
  onResolve,
  onClose,
}: IncidentLifecycleStepperProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const isDismissed = status === "DISMISSED";

  const steps = [
    { key: "DETECTED", label: isVietnamese ? "Phát hiện AI" : "AI Detected" },
    { key: "REVIEWED", label: isVietnamese ? "Thẩm duyệt" : "Reviewed" },
    { key: "RESOLVING", label: isVietnamese ? "Điều phối" : "Dispatched" },
    { key: "RESOLVED", label: isVietnamese ? "Đã khắc phục" : "Resolved" },
    { key: "CLOSED", label: isVietnamese ? "Nghiệm thu đóng" : "Closed" },
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

  const getStepAction = (stepKey: string): (() => void) | undefined => {
    if (stepKey === "REVIEWED" && status === "PENDING_REVIEW") {
      return onReview ?? (onStepClick ? () => onStepClick(stepKey) : undefined);
    }
    if (stepKey === "RESOLVING" && status === "CONFIRMED" && !hasAssignments) {
      if (awaitingDispatch) return undefined;
      return onAssign ?? (onStepClick ? () => onStepClick(stepKey) : undefined);
    }
    if (stepKey === "RESOLVED" && status === "CONFIRMED" && hasAssignments) {
      return onResolve ?? (onStepClick ? () => onStepClick(stepKey) : undefined);
    }
    if (stepKey === "CLOSED" && status === "RESOLVED") {
      return onClose ?? (onStepClick ? () => onStepClick(stepKey) : undefined);
    }
    return undefined;
  };

  const progressPercentage = isDismissed
    ? 25
    : Math.min(100, Math.max(0, (Math.min(currentWeight, 4) / 4) * 100));

  const getGuideConfig = (): GuideConfig | null => {
    if (status === "PENDING_REVIEW") {
      return {
        tone: "primary",
        icon: <CheckSquare className="h-4 w-4" />,
        pulse: Boolean(onReview),
        stepTag: isVietnamese ? "Bước 2/5" : "Step 2/5",
        metaTag: isVietnamese ? "Thẩm duyệt" : "Review",
        title: onReview
          ? isVietnamese
            ? "Thẩm duyệt & Xác nhận vi phạm an toàn"
            : "Review & Validate Safety Violation"
          : isVietnamese
            ? "Đang chờ Quản lý An toàn thẩm duyệt cảnh báo AI"
            : "Awaiting Safety Manager AI Alert Review",
        description: onReview
          ? isVietnamese
            ? "Đối chiếu ảnh chụp & khung nhận diện bên dưới để Xác nhận hoặc Bác bỏ."
            : "Cross-check camera evidence below to confirm or dismiss."
          : isVietnamese
            ? "Hồ sơ mới được Camera AI ghi nhận và đang chờ Quản lý An toàn thẩm duyệt, phân công."
            : "Newly detected by AI and awaiting Safety Manager review and assignment.",
        actions: onReview ? (
          <Button
            size="sm"
            variant="primary"
            onClick={onReview}
            className="h-9 gap-1.5 px-3.5 text-xs font-bold shadow-md"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Thẩm duyệt sự cố" : "Review Incident"}</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-75" />
          </Button>
        ) : undefined,
      };
    }

    if (status === "CONFIRMED" && !hasAssignments) {
      return {
        tone: "primary",
        icon: <UserCheck className="h-4 w-4" />,
        pulse: !awaitingDispatch && Boolean(onAssign || onResolve),
        stepTag: isVietnamese ? "Bước 3/5" : "Step 3/5",
        metaTag: isVietnamese ? "Điều phối" : "Dispatch",
        title: awaitingDispatch
          ? isVietnamese
            ? "Đang chờ Quản lý phát tín hiệu điều phối"
            : "Awaiting Manager Dispatch Signal"
          : isVietnamese
            ? "Phân công cán bộ điều phối hiện trường"
            : "Dispatch Field Safety Coordinator",
        description: awaitingDispatch
          ? isVietnamese
            ? "Sự cố đã được xác nhận. Khi Quản lý phân công cho bạn, bạn có thể báo cáo khắc phục tại đây."
            : "Violation confirmed. Once assigned to you, submit your remediation report here."
          : isVietnamese
            ? "Phát tín hiệu giao cán bộ hiện trường xử lý, hoặc bấm Tự khắc phục ngay."
            : "Dispatch a safety officer with a realtime signal, or resolve directly yourself.",
        actions:
          !awaitingDispatch && (onAssign || onResolve) ? (
            <div className="flex flex-wrap items-center gap-2">
              {onAssign && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={onAssign}
                  className="h-9 gap-1.5 px-3.5 text-xs font-bold shadow-md"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>
                    {isVietnamese ? "Giao Officer & Phát tín hiệu" : "Dispatch Officer"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-75" />
                </Button>
              )}
              {onResolve && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onResolve}
                  className="h-9 gap-1.5 px-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isVietnamese ? "Tự khắc phục ngay" : "Resolve Now"}</span>
                </Button>
              )}
            </div>
          ) : undefined,
      };
    }

    if (status === "CONFIRMED" && hasAssignments) {
      return {
        tone: "emerald",
        icon: <CheckCircle2 className="h-4 w-4" />,
        pulse: Boolean(onResolve),
        stepTag: isVietnamese ? "Bước 4/5" : "Step 4/5",
        metaTag: isVietnamese
          ? `Đang xử lý: ${assignedOfficerName || "Cán bộ giám sát"}`
          : `In progress: ${assignedOfficerName || "Field Officer"}`,
        title: isVietnamese
          ? "Xác nhận khắc phục hiện trường"
          : "Confirm Field Resolution",
        description: isVietnamese
          ? "Sau khi công nhân đã khắc phục xong (đội mũ/mặc áo), bấm xác nhận khắc phục."
          : "Officer is addressing this on site. Once the worker is compliant, confirm resolution.",
        actions: onResolve ? (
          <Button
            size="sm"
            variant="primary"
            onClick={onResolve}
            className="h-9 gap-1.5 bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 dark:bg-emerald-600"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Xác nhận đã khắc phục" : "Confirm Resolved"}</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-75" />
          </Button>
        ) : undefined,
      };
    }

    if (status === "RESOLVED") {
      return {
        tone: "slate",
        icon: <Archive className="h-4 w-4" />,
        pulse: Boolean(onClose),
        stepTag: isVietnamese ? "Bước 5/5" : "Step 5/5",
        metaTag: isVietnamese ? "Nghiệm thu" : "Acceptance",
        title: isVietnamese
          ? "Nghiệm thu an toàn & Đóng hồ sơ"
          : "Final Acceptance & Close Incident",
        description: isVietnamese
          ? "Hiện trường đã khắc phục xong. Kiểm tra lần cuối và tiến hành đóng hồ sơ lưu trữ."
          : "Field resolved successfully. Conduct final inspection and close the record.",
        actions: onClose ? (
          <Button
            size="sm"
            variant="primary"
            onClick={onClose}
            className="h-9 gap-1.5 bg-slate-700 px-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-slate-800"
          >
            <Archive className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Nghiệm thu & Đóng" : "Accept & Close"}</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-75" />
          </Button>
        ) : undefined,
      };
    }

    if (status === "CLOSED") {
      return {
        tone: "emerald",
        icon: <FileCheck2 className="h-4 w-4" />,
        stepTag: "100% COMPLETED",
        title: isVietnamese
          ? "Hồ sơ sự cố đã được nghiệm thu và đóng hoàn tất"
          : "Incident record has been verified and permanently closed",
        description: isVietnamese
          ? "Toàn bộ chuỗi quy trình an toàn đã thực hiện đầy đủ và bảo toàn chữ ký toàn vẹn số."
          : "The entire safety lifecycle has completed with digital integrity verification.",
      };
    }

    if (status === "DISMISSED") {
      return {
        tone: "muted",
        icon: <XCircle className="h-4 w-4" />,
        stepTag: "DISMISSED",
        title: isVietnamese
          ? "Sự cố đã được thẩm duyệt bác bỏ (Không phải vi phạm)"
          : "Incident was reviewed and dismissed (Not a violation)",
        description: isVietnamese
          ? "Hồ sơ này không yêu cầu phân công hoặc khắc phục tiếp theo."
          : "No assignment or resolution is required for this incident.",
      };
    }

    return null;
  };

  const guide = getGuideConfig();

  const cardBorderClass =
    guide?.tone === "emerald"
      ? "border-emerald-500/30"
      : guide?.tone === "primary"
        ? "border-primary/25"
        : "border-border/40";

  const stripBgClass =
    guide?.tone === "emerald"
      ? "bg-gradient-to-r from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent"
      : guide?.tone === "primary"
        ? "bg-gradient-to-r from-primary/[0.08] via-primary/[0.02] to-transparent"
        : guide?.tone === "slate"
          ? "bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent"
          : "bg-surface/40";

  const iconBoxClass =
    guide?.tone === "emerald"
      ? "border-emerald-500/35 text-emerald-600 dark:text-emerald-400"
      : guide?.tone === "muted"
        ? "border-border/50 bg-muted/60 text-muted-foreground"
        : "border-primary/35 text-primary";

  const pulseDotClass =
    guide?.tone === "emerald" ? "bg-emerald-500" : "bg-primary";

  const stepTagClass =
    guide?.tone === "emerald"
      ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : guide?.tone === "muted"
        ? "border-border/50 bg-muted text-muted-foreground"
        : "border-primary/35 bg-primary/15 text-primary";

  return (
    <section
      aria-label={
        isVietnamese ? "Tiến độ & bước xử lý sự cố" : "Incident lifecycle & next action"
      }
      className={`relative overflow-hidden rounded-[24px] sm:rounded-[28px] border bg-surface p-3.5 sm:p-5 transition-all duration-300 shadow-[7px_7px_16px_rgba(0,0,0,0.08),-7px_-7px_16px_rgba(255,255,255,0.75)] dark:shadow-[7px_7px_16px_rgba(0,0,0,0.3),-5px_-5px_12px_rgba(255,255,255,0.03)] ${cardBorderClass}`}
    >
      {/* Đường viền sáng khắc mảnh phía trên tạo độ sắc nét cho khối chassis */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/15"
      />

      <div className="space-y-4">
        {/* ── TẦNG TRÊN: THANH TIẾN ĐỘ 5 BƯỚC ĐIÊU KHẮC ── */}
        <div className="relative rounded-2xl bg-surface/60 px-2 py-3.5 sm:px-4 sm:py-4 shadow-[inset_4px_4px_9px_rgba(0,0,0,0.07),inset_-4px_-4px_9px_rgba(255,255,255,0.75)] dark:shadow-[inset_4px_4px_9px_rgba(0,0,0,0.28),inset_-3px_-3px_7px_rgba(255,255,255,0.03)]">
          <div className="relative flex items-start justify-between">
            {/* Rãnh ray kết nối đúc chìm (căn chuẩn tâm của node h-9 / sm:h-10) */}
            <div
              aria-hidden="true"
              className="absolute left-[10%] right-[10%] top-[18px] sm:top-[20px] h-[6px] -translate-y-1/2 overflow-hidden rounded-full bg-background/80 p-[1px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.16),inset_-1px_-1px_2px_rgba(255,255,255,0.65)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.45),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]"
            >
              {!isDismissed && (
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/85 to-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_0_8px_hsl(var(--primary)/0.35)] transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              )}
            </div>

            {steps.map((step, idx) => {
              const state = getStepState(idx);
              const stepAction = state === "current" ? getStepAction(step.key) : undefined;
              const isClickable = Boolean(stepAction);

              const content = (
                <>
                  {/* 3D Sculpted Step Node */}
                  <div
                    className={`
                  relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center
                  rounded-full font-mono text-xs font-extrabold
                  transition-all duration-300
                  ${state === "completed"
                        ? `
                        bg-gradient-to-br from-primary to-primary/85 text-primary-foreground
                        shadow-[4px_4px_8px_rgba(0,0,0,0.18),-3px_-3px_7px_rgba(255,255,255,0.65),inset_0_1.5px_1px_rgba(255,255,255,0.4)]
                        dark:shadow-[4px_4px_8px_rgba(0,0,0,0.38),-2px_-2px_5px_rgba(255,255,255,0.05),inset_0_1px_1px_rgba(255,255,255,0.2)]
                      `
                        : state === "current"
                          ? `
                          border-2 border-primary bg-surface text-primary
                          animate-gentle-pulse-ring
                          ${isClickable ? "group-hover:-translate-y-0.5 group-hover:scale-105 group-active:scale-95" : ""}
                          shadow-[5px_5px_10px_rgba(0,0,0,0.14),-4px_-4px_9px_rgba(255,255,255,0.8),inset_2px_2px_5px_rgba(0,0,0,0.08)]
                          dark:shadow-[5px_5px_10px_rgba(0,0,0,0.35),-3px_-3px_7px_rgba(255,255,255,0.05),inset_2px_2px_5px_rgba(0,0,0,0.25)]
                        `
                          : state === "dismissed"
                            ? `
                            border border-border/50 bg-muted/80 text-muted-foreground
                            shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-2px_-2px_5px_rgba(255,255,255,0.6)]
                            dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.28),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]
                          `
                            : `
                            border border-border/40 bg-surface text-muted-foreground/80
                            shadow-[3px_3px_7px_rgba(0,0,0,0.08),-3px_-3px_7px_rgba(255,255,255,0.75)]
                            dark:shadow-[3px_3px_7px_rgba(0,0,0,0.25),-2px_-2px_5px_rgba(255,255,255,0.03)]
                          `
                      }
                `}
                  >
                    {state === "completed" ? (
                      <Check className="h-4 w-4 stroke-[3]" />
                    ) : state === "dismissed" ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}

                    {/* Vòng sáng viền trong cho trạng thái Completed & Current */}
                    {(state === "completed" || state === "current") && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-[2px] rounded-full border border-white/25 dark:border-white/10"
                      />
                    )}
                  </div>

                  {/* Nhãn bước + Chỉ báo trạng thái dưới chân */}
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`
                    max-w-[78px] sm:max-w-[112px] text-center text-[10px] sm:text-[11px]
                    leading-tight tracking-tight transition-colors duration-200
                    ${state === "current"
                          ? `font-extrabold text-primary ${isClickable ? "group-hover:underline" : ""}`
                          : state === "completed"
                            ? "font-bold text-foreground"
                            : "font-semibold text-muted-foreground"
                        }
                  `}
                    >
                      {step.label}
                    </span>

                    {state === "current" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary">
                        <span className="h-1 w-1 rounded-full bg-primary" />
                        {isClickable
                          ? isVietnamese
                            ? "Thực hiện"
                            : "Action"
                          : isVietnamese
                            ? "Hiện tại"
                            : "Current"}
                      </span>
                    )}
                  </div>
                </>
              );

              if (isClickable && stepAction) {
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={stepAction}
                    className="group relative z-10 flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-2 focus-visible:outline-none"
                    title={
                      isVietnamese
                        ? `Bấm để thực hiện bước: ${step.label}`
                        : `Click to execute step: ${step.label}`
                    }
                  >
                    {content}
                  </button>
                );
              }

              return (
                <div
                  key={step.key}
                  className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-2"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── TẦNG DƯỚI: NEXT ACTION CONSOLE ── */}
        {guide && (
          <div
            className={`flex flex-col gap-3.5 rounded-2xl border border-border/40 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.65)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.22),inset_-2px_-2px_5px_rgba(255,255,255,0.02)] ${stripBgClass}`}
          >
            {/* Trái: Icon 3D + Nội dung hướng dẫn */}
            <div className="flex min-w-0 items-start sm:items-center gap-3.5">
              {/* Sculpted Icon Well */}
              <div
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-surface shadow-[4px_4px_9px_rgba(0,0,0,0.09),-4px_-4px_9px_rgba(255,255,255,0.75),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[4px_4px_9px_rgba(0,0,0,0.32),-3px_-3px_7px_rgba(255,255,255,0.03)] ${iconBoxClass}`}
              >
                {guide.icon}

                {guide.pulse && (
                  <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-surface ring-2 ring-surface">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${pulseDotClass}`}
                    />
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${pulseDotClass}`}
                    />
                  </span>
                )}
              </div>

              {/* Text Info */}
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${stepTagClass}`}
                  >
                    {guide.stepTag}
                  </span>

                  <h4 className="text-xs font-extrabold tracking-tight text-foreground sm:text-sm">
                    {guide.title}
                  </h4>

                  {guide.metaTag && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-background/70 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-muted-foreground">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                      {guide.metaTag}
                    </span>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  {guide.description}
                </p>
              </div>
            </div>

            {/* Phải: Khay nút hành động */}
            {guide.actions && (
              <div className="shrink-0 self-end sm:self-center pt-1 sm:pt-0">
                {guide.actions}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
