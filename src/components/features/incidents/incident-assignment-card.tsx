"use client";

import { AlertCircle, Calendar, Clock, User, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IncidentAssignmentItem } from "@/types";

export interface IncidentAssignmentCardProps {
  assignments?: IncidentAssignmentItem[];
  onAssign?: () => void;
  canManage?: boolean;
}

export function IncidentAssignmentCard({
  assignments = [],
  onAssign,
  canManage = true,
}: IncidentAssignmentCardProps) {
  const activeAssignment = assignments.find((a) => a.status === "ACTIVE") || assignments[0];

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            Cán bộ Điều phối Hiện trường
          </h4>
        </div>

        {canManage && onAssign && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAssign}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{activeAssignment ? "Đổi người" : "Phân công"}</span>
          </Button>
        )}
      </div>

      {/* Content */}
      {activeAssignment ? (
        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
              <User className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-foreground">
                {activeAssignment.assignedToName || "Cán bộ An toàn Giám sát"}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {activeAssignment.assignedToEmail || activeAssignment.assignedTo.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="rounded-xl border border-border/30 bg-surface/50 p-2.5">
              <span className="text-muted-foreground">Mức ưu tiên:</span>
              <p className="font-bold text-primary mt-0.5">
                {activeAssignment.priority || "NORMAL"}
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-surface/50 p-2.5">
              <span className="text-muted-foreground">Hạn chót:</span>
              <p className="font-bold text-danger mt-0.5">
                {activeAssignment.deadline
                  ? new Date(activeAssignment.deadline).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Trong ca trực"}
              </p>
            </div>
          </div>

          {activeAssignment.note && (
            <p className="text-[11px] text-muted-foreground italic">
              Ghi chú: {activeAssignment.note}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
          Chưa có cán bộ nào được phân công điều phối sự cố này.
        </div>
      )}
    </div>
  );
}
