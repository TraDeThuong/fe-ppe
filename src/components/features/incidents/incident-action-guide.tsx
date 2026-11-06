"use client";

import {
  AlertCircle,
  Archive,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Compass,
  FileCheck2,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentStatus } from "@/types";

export interface IncidentActionGuideProps {
  status: IncidentStatus | string;
  hasAssignments?: boolean;
  assignedOfficerName?: string;
  onReview?: () => void;
  onAssign?: () => void;
  onResolve?: () => void;
  onClose?: () => void;
}

export function IncidentActionGuide({
  status,
  hasAssignments = false,
  assignedOfficerName,
  onReview,
  onAssign,
  onResolve,
  onClose,
}: IncidentActionGuideProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Xác định cấu hình chỉ dẫn dựa trên trạng thái vòng đời
  if (status === "PENDING_REVIEW") {
    return (
      <div
        className="
          relative overflow-hidden rounded-2xl border border-primary/30
          bg-gradient-to-r from-primary/10 via-surface to-surface p-4 sm:p-5
          shadow-[5px_5px_12px_rgba(0,0,0,0.07),-5px_-5px_12px_rgba(255,255,255,0.65)]
          dark:shadow-[5px_5px_12px_rgba(0,0,0,0.22),-4px_-4px_10px_rgba(255,255,255,0.025)]
        "
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className="
                relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                border border-primary/40 bg-surface text-primary
                shadow-[3px_3px_6px_rgba(0,0,0,0.1),-3px_-3px_6px_rgba(255,255,255,0.65)]
                dark:shadow-[3px_3px_6px_rgba(0,0,0,0.25),-2px_-2px_5px_rgba(255,255,255,0.03)]
              "
            >
              <CheckSquare className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                  {isVietnamese ? "Bước tiếp theo (2/5)" : "Next Step (2/5)"}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Hành động yêu cầu: Thẩm duyệt" : "Action required: Review"}
                </span>
              </div>

              <h4 className="text-sm font-extrabold tracking-tight text-foreground sm:text-base">
                {isVietnamese
                  ? "Thẩm duyệt & Xác nhận vi phạm an toàn"
                  : "Review & Validate Safety Violation"}
              </h4>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? "AI đã phát hiện nghi vấn vi phạm PPE. Hãy đối chiếu ảnh chụp và khung nhận diện bên trái để Xác nhận hoặc Bác bỏ."
                  : "AI detected a potential PPE violation. Please cross-check camera evidence to confirm or dismiss."}
              </p>
            </div>
          </div>

          {onReview && (
            <div className="shrink-0 self-end sm:self-center">
              <Button
                variant="primary"
                onClick={onReview}
                className="animate-gentle-pulse-ring gap-2 font-bold shadow-md"
              >
                <CheckSquare className="h-4 w-4" />
                <span>{isVietnamese ? "Thẩm duyệt sự cố" : "Review Incident"}</span>
                <ArrowRight className="h-4 w-4 opacity-75" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "CONFIRMED" && !hasAssignments) {
    return (
      <div
        className="
          relative overflow-hidden rounded-2xl border border-primary/30
          bg-gradient-to-r from-primary/10 via-surface to-surface p-4 sm:p-5
          shadow-[5px_5px_12px_rgba(0,0,0,0.07),-5px_-5px_12px_rgba(255,255,255,0.65)]
          dark:shadow-[5px_5px_12px_rgba(0,0,0,0.22),-4px_-4px_10px_rgba(255,255,255,0.025)]
        "
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className="
                relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                border border-primary/40 bg-surface text-primary
                shadow-[3px_3px_6px_rgba(0,0,0,0.1),-3px_-3px_6px_rgba(255,255,255,0.65)]
                dark:shadow-[3px_3px_6px_rgba(0,0,0,0.25),-2px_-2px_5px_rgba(255,255,255,0.03)]
              "
            >
              <UserCheck className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                  {isVietnamese ? "Bước tiếp theo (3/5)" : "Next Step (3/5)"}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Hành động yêu cầu: Phân công" : "Action required: Assignment"}
                </span>
              </div>

              <h4 className="text-sm font-extrabold tracking-tight text-foreground sm:text-base">
                {isVietnamese
                  ? "Phân công cán bộ điều phối hiện trường"
                  : "Dispatch Field Safety Coordinator"}
              </h4>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? "Sự cố đã được thẩm duyệt. Hãy phân công cán bộ an toàn tại hiện trường để tiếp cận và xử lý vi phạm."
                  : "Violation confirmed. Dispatch a safety officer to the scene to resolve this violation."}
              </p>
            </div>
          </div>

          {onAssign && (
            <div className="shrink-0 self-end sm:self-center">
              <Button
                variant="primary"
                onClick={onAssign}
                className="animate-gentle-pulse-ring gap-2 font-bold shadow-md"
              >
                <UserCheck className="h-4 w-4" />
                <span>{isVietnamese ? "Phân công cán bộ" : "Assign Officer"}</span>
                <ArrowRight className="h-4 w-4 opacity-75" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "CONFIRMED" && hasAssignments) {
    return (
      <div
        className="
          relative overflow-hidden rounded-2xl border border-emerald-500/30
          bg-gradient-to-r from-emerald-500/10 via-surface to-surface p-4 sm:p-5
          shadow-[5px_5px_12px_rgba(0,0,0,0.07),-5px_-5px_12px_rgba(255,255,255,0.65)]
          dark:shadow-[5px_5px_12px_rgba(0,0,0,0.22),-4px_-4px_10px_rgba(255,255,255,0.025)]
        "
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className="
                relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                border border-emerald-500/40 bg-surface text-emerald-600 dark:text-emerald-400
                shadow-[3px_3px_6px_rgba(0,0,0,0.1),-3px_-3px_6px_rgba(255,255,255,0.65)]
                dark:shadow-[3px_3px_6px_rgba(0,0,0,0.25),-2px_-2px_5px_rgba(255,255,255,0.03)]
              "
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {isVietnamese ? "Bước tiếp theo (4/5)" : "Next Step (4/5)"}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isVietnamese
                    ? `Đang xử lý: ${assignedOfficerName || "Cán bộ giám sát"}`
                    : `In progress: ${assignedOfficerName || "Field Officer"}`}
                </span>
              </div>

              <h4 className="text-sm font-extrabold tracking-tight text-foreground sm:text-base">
                {isVietnamese
                  ? "Xác nhận khắc phục hiện trường"
                  : "Confirm Field Resolution"}
              </h4>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? "Cán bộ đang xử lý tại hiện trường. Sau khi công nhân đã khắc phục xong (đội mũ/mặc áo), bấm xác nhận khắc phục."
                  : "Officer is addressing this on site. Once the worker is compliant, confirm resolution."}
              </p>
            </div>
          </div>

          {onResolve && (
            <div className="shrink-0 self-end sm:self-center">
              <Button
                variant="primary"
                onClick={onResolve}
                className="animate-gentle-pulse-ring gap-2 bg-emerald-600 font-bold text-white shadow-md hover:bg-emerald-700 dark:bg-emerald-600"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isVietnamese ? "Xác nhận đã khắc phục" : "Confirm Resolved"}</span>
                <ArrowRight className="h-4 w-4 opacity-75" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "RESOLVED") {
    return (
      <div
        className="
          relative overflow-hidden rounded-2xl border border-primary/30
          bg-gradient-to-r from-primary/10 via-surface to-surface p-4 sm:p-5
          shadow-[5px_5px_12px_rgba(0,0,0,0.07),-5px_-5px_12px_rgba(255,255,255,0.65)]
          dark:shadow-[5px_5px_12px_rgba(0,0,0,0.22),-4px_-4px_10px_rgba(255,255,255,0.025)]
        "
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className="
                relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                border border-primary/40 bg-surface text-primary
                shadow-[3px_3px_6px_rgba(0,0,0,0.1),-3px_-3px_6px_rgba(255,255,255,0.65)]
                dark:shadow-[3px_3px_6px_rgba(0,0,0,0.25),-2px_-2px_5px_rgba(255,255,255,0.03)]
              "
            >
              <Archive className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                  {isVietnamese ? "Bước tiếp theo (5/5)" : "Next Step (5/5)"}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Hành động yêu cầu: Nghiệm thu" : "Action required: Acceptance & Close"}
                </span>
              </div>

              <h4 className="text-sm font-extrabold tracking-tight text-foreground sm:text-base">
                {isVietnamese
                  ? "Nghiệm thu an toàn & Đóng hồ sơ"
                  : "Final Acceptance & Close Incident"}
              </h4>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? "Hiện trường đã khắc phục thành công. Cán bộ giám sát kiểm tra lần cuối và tiến hành đóng hồ sơ lưu trữ an toàn."
                  : "Field resolved successfully. Safety supervisor conducts final inspection and closes the record."}
              </p>
            </div>
          </div>

          {onClose && (
            <div className="shrink-0 self-end sm:self-center">
              <Button
                variant="primary"
                onClick={onClose}
                className="animate-gentle-pulse-ring gap-2 bg-slate-700 font-bold text-white shadow-md hover:bg-slate-800 dark:bg-slate-800"
              >
                <Archive className="h-4 w-4" />
                <span>{isVietnamese ? "Nghiệm thu & Đóng" : "Accept & Close"}</span>
                <ArrowRight className="h-4 w-4 opacity-75" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "CLOSED") {
    return (
      <div
        className="
          relative overflow-hidden rounded-2xl border border-emerald-500/25
          bg-emerald-500/5 p-4 sm:p-4.5
          shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.6)]
          dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]
        "
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                100% COMPLETED
              </span>
              <h5 className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? "Hồ sơ sự cố đã được nghiệm thu và đóng hoàn tất"
                  : "Incident record has been verified and permanently closed"}
              </h5>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {isVietnamese
                ? "Toàn bộ chuỗi quy trình an toàn đã thực hiện đầy đủ và bảo toàn chữ ký toàn vẹn số."
                : "The entire safety lifecycle has completed with digital integrity verification."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "DISMISSED") {
    return (
      <div
        className="
          relative overflow-hidden rounded-2xl border border-border/40
          bg-surface/50 p-4 sm:p-4.5
          shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.6)]
          dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]
        "
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-muted-foreground">
                DISMISSED
              </span>
              <h5 className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? "Sự cố đã được thẩm duyệt bác bỏ (Không phải vi phạm)"
                  : "Incident was reviewed and dismissed (Not a violation)"}
              </h5>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {isVietnamese
                ? "Hồ sơ này không yêu cầu phân công hoặc khắc phục tiếp theo."
                : "No assignment or resolution is required for this incident."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

