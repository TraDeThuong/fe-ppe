"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import { incidentGroupHref } from "@/lib/incident-group";
import { summarizeIncidentGroup } from "@/lib/incident-assignment-groups";
import type { ResponsiblePersonRef } from "@/lib/incident-workflow";
import type { IncidentItem } from "@/types";
import type { AssignmentFormatters, DispatchedGroupView } from "./types";

export interface DispatchedGroupCardProps {
  entry: DispatchedGroupView;
  usersById: ReadonlyMap<string, ResponsiblePersonRef>;
  formatters: AssignmentFormatters;
  showAssignee?: boolean;
  onBatchResolve?: (items: IncidentItem[]) => void;
}

export function DispatchedGroupCard({
  entry,
  usersById,
  formatters,
  showAssignee = false,
  onBatchResolve,
}: DispatchedGroupCardProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { group, message, memberIncidents, resolvedCount, remainingEditableItems } =
    entry;

  const total = group.incidentIds.length;
  const pct = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
  const managerName =
    usersById.get(group.assignedBy)?.name ||
    (isVietnamese ? "Quản lý An toàn" : "Safety Manager");
  const assigneeName =
    usersById.get(group.assignedTo)?.name ||
    `Officer #${group.assignedTo.slice(0, 8)}`;

  const summary = summarizeIncidentGroup(
    memberIncidents,
    formatters.resolveCameraLabel,
  );

  return (
    <div
      data-testid="dispatched-group-card"
      className={`space-y-3 rounded-2xl border border-primary/25 p-4 ${NM.extruded}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info" size="sm" className="font-mono text-[10px]">
              #{group.groupId.slice(0, 8)}
            </Badge>
            <span className="text-xs font-extrabold text-foreground">
              {total} {isVietnamese ? "sự cố trong đợt" : "incidents in batch"}
            </span>
            {memberIncidents.length > 1 &&
              summary.estimatedDistinctPersons < memberIncidents.length && (
                <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                  <Users className="h-2.5 w-2.5" />
                  <span>
                    ≈ {summary.estimatedDistinctPersons}{" "}
                    {isVietnamese ? "đối tượng" : "persons"}
                  </span>
                </span>
              )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isVietnamese ? "Giao bởi: " : "Assigned by: "}
            <strong className="text-foreground">{managerName}</strong>
            {showAssignee && (
              <>
                {" → "}
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <UserCheck className="h-3 w-3" />
                  {assigneeName}
                </span>
              </>
            )}{" "}
            • {new Date(group.createdAt).toLocaleString(locale)}
          </p>
        </div>

        <span className="rounded-xl bg-primary/10 px-2.5 py-1 font-mono text-xs font-extrabold text-primary">
          {resolvedCount}/{total} ({pct}%)
        </span>
      </div>

      {/* Rich breakdown inside this dispatch batch */}
      {memberIncidents.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {summary.severityCounts.CRITICAL > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/35 bg-rose-500/12 px-1.5 py-0.5 font-bold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>
                {summary.severityCounts.CRITICAL}{" "}
                {isVietnamese ? "Khẩn cấp" : "Critical"}
              </span>
            </span>
          )}
          {summary.severityCounts.HIGH > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/12 px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">
              <span>
                {summary.severityCounts.HIGH} {isVietnamese ? "Cao" : "High"}
              </span>
            </span>
          )}
          {summary.violationBreakdown.slice(0, 3).map((vb) => (
            <span
              key={vb.type}
              className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background px-1.5 py-0.5 font-semibold text-foreground/90"
            >
              <ShieldAlert className="h-2.5 w-2.5 text-danger" />
              <span>
                {vb.count} {formatters.formatViolation(vb.type)}
              </span>
            </span>
          ))}
          {summary.cameraLabels.slice(0, 2).map((cam) => (
            <span
              key={cam}
              className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background px-1.5 py-0.5 font-mono text-muted-foreground"
            >
              <Camera className="h-2.5 w-2.5 text-primary" />
              <span className="max-w-[120px] truncate">{cam}</span>
            </span>
          ))}
        </div>
      )}

      <p className="line-clamp-2 text-xs text-muted-foreground">{message}</p>

      <div className={`h-2 overflow-hidden rounded-full ${NM.recessed}`}>
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {onBatchResolve && remainingEditableItems.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => onBatchResolve(remainingEditableItems)}
            className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {isVietnamese
                ? `Báo cáo khắc phục cả nhóm (${remainingEditableItems.length})`
                : `Resolve Group (${remainingEditableItems.length})`}
            </span>
          </Button>
        )}

        <Link
          href={incidentGroupHref(group)}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          <span>
            {isVietnamese
              ? "Vào xử lý từng bước (Trước/Tiếp)"
              : "Step-by-Step Workspace"}
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
