
"use client";

import {
  Calendar,
  Clock,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentAssignmentItem } from "@/types";

export interface IncidentAssignmentCardProps {
  assignments?: IncidentAssignmentItem[];
  onAssign?: () => void;
  canManage?: boolean;
  isNextAction?: boolean;
}

export function IncidentAssignmentCard({
  assignments = [],
  onAssign,
  canManage = true,
  isNextAction = false,
}: IncidentAssignmentCardProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const activeAssignment =
    assignments.find((a) => a.status === "ACTIVE") || assignments[0];

  const priority = activeAssignment?.priority || "NORMAL";

  const deadline = activeAssignment?.deadline
    ? new Date(activeAssignment.deadline).toLocaleTimeString(
        isVietnamese ? "vi-VN" : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )
    : isVietnamese
      ? "Trong ca trực"
      : "Current shift";

  return (
    <section
      className={`
        relative space-y-4 overflow-hidden rounded-2xl
        border bg-surface p-4 sm:p-5
        transition-all duration-300
        ${
          isNextAction
            ? "border-primary/60 ring-2 ring-primary/40 animate-gentle-pulse-border shadow-[0_0_20px_rgba(163,81,57,0.2)]"
            : "border-border/40 shadow-[5px_5px_12px_rgba(0,0,0,0.07),-5px_-5px_12px_rgba(255,255,255,0.65)] dark:shadow-[5px_5px_12px_rgba(0,0,0,0.22),-4px_-4px_10px_rgba(255,255,255,0.025)]"
        }
      `}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`
              flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
              border border-border/30 bg-surface
              ${
                isNextAction
                  ? "text-primary ring-2 ring-primary/30 animate-gentle-pulse-ring"
                  : "shadow-[3px_3px_6px_rgba(0,0,0,0.09),-3px_-3px_6px_rgba(255,255,255,0.65)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.22),-2px_-2px_5px_rgba(255,255,255,0.025)]"
              }
            `}
          >
            <UserCheck className="h-4 w-4 text-primary" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold tracking-tight text-foreground">
                {isVietnamese
                  ? "Cán bộ Điều phối Hiện trường"
                  : "Field Safety Coordinator"}
              </h4>
              {isNextAction && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-extrabold text-primary animate-pulse">
                  {isVietnamese ? "Cần phân công" : "Action Needed"}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
              {isVietnamese ? "ĐIỀU PHỐI & XỬ LÝ SỰ CỐ" : "INCIDENT COORDINATION"}
            </p>
          </div>
        </div>

        {canManage && onAssign && (
          <Button
            size="sm"
            variant={isNextAction ? "primary" : "ghost"}
            onClick={onAssign}
            className={`
              flex shrink-0 items-center gap-1.5 rounded-lg
              text-xs font-bold
              ${
                isNextAction
                  ? "animate-gentle-pulse-ring shadow-md"
                  : "text-primary shadow-[2px_2px_5px_rgba(0,0,0,0.07),-2px_-2px_5px_rgba(255,255,255,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_7px_rgba(0,0,0,0.09),-3px_-3px_7px_rgba(255,255,255,0.65)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.2),-2px_-2px_5px_rgba(255,255,255,0.025)]"
              }
            `}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {activeAssignment
              ? isVietnamese
                ? "Đổi người"
                : "Reassign"
              : isVietnamese
                ? "Phân công ngay"
                : "Assign Now"}
          </Button>
        )}
      </div>

      {/* Recessed Divider */}
      <div className="h-[2px] rounded-full bg-border/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]" />

      {activeAssignment ? (
        <div className="space-y-3">
          {/* Assigned Officer - Main Sculpted Panel */}
          <div
            className="
              relative flex min-w-0 items-center gap-3.5 overflow-hidden
              rounded-xl border border-border/25 bg-surface/60 p-3.5
              shadow-[4px_4px_9px_rgba(0,0,0,0.08),-4px_-4px_9px_rgba(255,255,255,0.7)]
              dark:shadow-[4px_4px_9px_rgba(0,0,0,0.2),-3px_-3px_8px_rgba(255,255,255,0.025)]
            "
          >
            {/* Avatar Recess */}
            <div
              className="
                relative flex h-12 w-12 shrink-0 items-center justify-center
                rounded-xl border border-border/20 bg-surface
                shadow-[inset_3px_3px_6px_rgba(0,0,0,0.12),inset_-3px_-3px_6px_rgba(255,255,255,0.7)]
                dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.25),inset_-2px_-2px_5px_rgba(255,255,255,0.025)]
              "
            >
              <User className="h-5 w-5 text-primary" />

              <div className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_4px_rgba(0,0,0,0.2)]" />
            </div>

            {/* Officer Information */}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {isVietnamese ? "NGƯỜI ĐƯỢC PHÂN CÔNG" : "ASSIGNED OFFICER"}
              </p>

              <p className="break-words text-sm font-extrabold leading-snug text-foreground">
                {activeAssignment.assignedToName ||
                  (isVietnamese
                    ? "Cán bộ An toàn Giám sát"
                    : "Supervising Safety Officer")}
              </p>

              <p className="break-all font-mono text-[10px] leading-relaxed text-muted-foreground">
                {activeAssignment.assignedToEmail ||
                  activeAssignment.assignedTo.slice(0, 8)}
              </p>
            </div>

            <div className="hidden shrink-0 self-start rounded-lg border border-border/20 bg-surface/70 px-2 py-1 text-[9px] font-bold text-primary shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)] sm:block">
              {isVietnamese ? "ĐANG XỬ LÝ" : "ASSIGNED"}
            </div>
          </div>

          {/* Assignment Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div
              className="
                relative min-w-0 rounded-xl border border-border/25
                bg-surface/60 p-3
                shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.65)]
                dark:shadow-[3px_3px_7px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(255,255,255,0.025)]
              "
            >
              <div className="flex items-center gap-2">
                <div
                  className="
                    flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                    bg-surface/80
                    shadow-[inset_2px_2px_4px_rgba(0,0,0,0.09),inset_-2px_-2px_4px_rgba(255,255,255,0.6)]
                    dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.025)]
                  "
                >
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>

                <span className="text-[10px] font-bold text-muted-foreground">
                  {isVietnamese ? "Mức ưu tiên" : "Priority"}
                </span>
              </div>

              <p className="mt-3 break-words pl-1 text-sm font-extrabold text-primary">
                {priority}
              </p>

              <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
            </div>

            {/* Deadline */}
            <div
              className="
                relative min-w-0 rounded-xl border border-border/25
                bg-surface/60 p-3
                shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.65)]
                dark:shadow-[3px_3px_7px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(255,255,255,0.025)]
              "
            >
              <div className="flex items-center gap-2">
                <div
                  className="
                    flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                    bg-surface/80
                    shadow-[inset_2px_2px_4px_rgba(0,0,0,0.09),inset_-2px_-2px_4px_rgba(255,255,255,0.6)]
                    dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.025)]
                  "
                >
                  <Clock className="h-3.5 w-3.5 text-danger" />
                </div>

                <span className="text-[10px] font-bold text-muted-foreground">
                  {isVietnamese ? "Hạn chót" : "Deadline"}
                </span>
              </div>

              <p className="mt-3 break-words pl-1 text-sm font-extrabold text-danger">
                {deadline}
              </p>

              <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
            </div>
          </div>

          {/* Assignment Note */}
          {activeAssignment.note && (
            <div
              className="
                rounded-xl border border-border/25 bg-surface/50 p-3
                shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.6)]
                dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.025)]
              "
            >
              <p className="text-[10px] font-bold text-muted-foreground">
                {isVietnamese ? "GHI CHÚ ĐIỀU PHỐI" : "COORDINATION NOTE"}
              </p>

              <p className="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground">
                {activeAssignment.note}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div
          className="
            flex flex-col items-center justify-center gap-3
            rounded-xl border border-dashed border-border/50
            bg-surface/40 px-4 py-6 text-center
            shadow-[inset_3px_3px_7px_rgba(0,0,0,0.06),inset_-3px_-3px_7px_rgba(255,255,255,0.5)]
            dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2),inset_-2px_-2px_6px_rgba(255,255,255,0.025)]
          "
        >
          <div
            className="
              flex h-11 w-11 items-center justify-center rounded-xl
              border border-border/30 bg-surface
              shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.6)]
              dark:shadow-[3px_3px_6px_rgba(0,0,0,0.2),-2px_-2px_5px_rgba(255,255,255,0.025)]
            "
          >
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="max-w-[260px] text-xs font-medium leading-relaxed text-muted-foreground">
            {isVietnamese
              ? "Chưa có cán bộ nào được phân công điều phối sự cố này."
              : "No officer has been assigned to coordinate this incident yet."}
          </p>

          {canManage && onAssign && (
            <Button
              size="sm"
              variant="primary"
              onClick={onAssign}
              className={`
                mt-1 flex items-center gap-1.5 font-bold shadow-md
                ${isNextAction ? "animate-gentle-pulse-ring" : ""}
              `}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Phân công cán bộ ngay" : "Assign Officer Now"}</span>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
