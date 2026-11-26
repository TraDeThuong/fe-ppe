"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Archive,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Send,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TableBulkAction } from "@/components/ui/table";
import {
  isIncidentAssignedToUser,
  type CameraIncidentGroup,
} from "@/lib/incident-workflow";
import type { IncidentItem } from "@/types";
import { IncidentSeverityBadge } from "../incident-severity-badge";
import { IncidentStatusBadge } from "../incident-status-badge";
import { getIncidentEvidenceUrl } from "../incident-table";
import {
  incidentHasVideoEvidence,
  IncidentTelemetryChips,
  IncidentThumbnail,
} from "./incident-thumbnail";

export interface IncidentCameraGroupsViewProps {
  toolbar?: ReactNode;
  cameraGroups: CameraIncidentGroup[];
  selectedIdSet: Set<string>;
  bulkActions: TableBulkAction[];
  canSelectRows: boolean;
  canBatchReview: boolean;
  canBatchDispatch: boolean;
  canBatchResolve: boolean;
  canBatchClose: boolean;
  anyBatchPending: boolean;
  isOfficerRole: boolean;
  currentUserId?: string;
  isVietnamese: boolean;
  locale: string;
  highlightedId?: string | null;
  collapsedMap: Record<string, boolean>;
  onToggleCollapse: (key: string) => void;
  onToggleGroupSelection: (ids: string[]) => void;
  onToggleSingleRow: (id: string) => void;
  onBatchReview?: (ids: string[], action: "CONFIRM" | "REJECT") => Promise<void> | void;
  onBatchDispatch?: (items: IncidentItem[]) => Promise<void> | void;
  onBatchResolve?: (items: IncidentItem[]) => Promise<void> | void;
  onBatchClose?: (items: IncidentItem[]) => Promise<void> | void;
  getSiteName: (siteId?: string | null) => string;
  formatViolation: (type: string) => string;
}

export function IncidentCameraGroupsView({
  toolbar,
  cameraGroups,
  selectedIdSet,
  bulkActions,
  canSelectRows,
  canBatchReview,
  canBatchDispatch,
  canBatchResolve,
  canBatchClose,
  anyBatchPending,
  isOfficerRole,
  currentUserId,
  isVietnamese,
  locale,
  highlightedId,
  collapsedMap,
  onToggleCollapse,
  onToggleGroupSelection,
  onToggleSingleRow,
  onBatchReview,
  onBatchDispatch,
  onBatchResolve,
  onBatchClose,
  getSiteName,
  formatViolation,
}: IncidentCameraGroupsViewProps) {
  return (
    <div className="space-y-4">
      {toolbar}

      {selectedIdSet.size > 0 && bulkActions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2.5 shadow-sm">
          <span className="text-xs font-bold text-foreground">
            {isVietnamese
              ? `Đang chọn ${selectedIdSet.size} sự cố`
              : `${selectedIdSet.size} incidents selected`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions.map((act) => (
              <Button
                key={act.id}
                type="button"
                size="sm"
                variant={act.variant === "primary" ? "primary" : "outline"}
                disabled={act.disabled}
                onClick={() => void act.onClick()}
                className="gap-1.5 text-xs"
              >
                {act.icon}
                <span>{act.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {cameraGroups.map((grp) => {
          const allIds = grp.items.map((i) => i.id);
          const selectedInGroup = allIds.filter((id) => selectedIdSet.has(id)).length;
          const isAllSelected = selectedInGroup === allIds.length && allIds.length > 0;
          const isCollapsed = Boolean(collapsedMap[grp.cameraKey]);
          const siteName = grp.items[0]?.siteName || getSiteName(grp.items[0]?.siteId);

          return (
            <div
              key={grp.cameraKey}
              className="overflow-hidden rounded-2xl border border-border/50 bg-surface shadow-nm-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 bg-muted/20 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {canSelectRows && (
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={() => onToggleGroupSelection(allIds)}
                      className="h-4 w-4 cursor-pointer rounded accent-primary"
                      aria-label={`Select all incidents for ${grp.cameraLabel}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleCollapse(grp.cameraKey)}
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Camera className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-foreground">
                        {grp.cameraLabel}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {siteName} • {grp.items.length}{" "}
                        {isVietnamese ? "sự cố" : "incidents"}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {grp.pendingIds.length > 0 && (
                    <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      {grp.pendingIds.length} {isVietnamese ? "chờ duyệt" : "pending"}
                    </span>
                  )}
                  {grp.confirmedIds.length > 0 && (
                    <span className="rounded-lg bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                      {grp.confirmedIds.length} {isVietnamese ? "đang xử lý" : "active"}
                    </span>
                  )}
                  {grp.resolvedIds.length > 0 && (
                    <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {grp.resolvedIds.length} {isVietnamese ? "chờ đóng" : "resolved"}
                    </span>
                  )}

                  {canBatchReview && onBatchReview && grp.pendingIds.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={anyBatchPending}
                      onClick={() => void onBatchReview(grp.pendingIds, "CONFIRM")}
                      className="h-7 gap-1 px-2.5 text-[11px]"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>
                        {isVietnamese
                          ? `Xác nhận nhóm (${grp.pendingIds.length})`
                          : `Confirm Group (${grp.pendingIds.length})`}
                      </span>
                    </Button>
                  )}

                  {canBatchDispatch && onBatchDispatch && grp.dispatchableIds.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={anyBatchPending}
                      onClick={() =>
                        void onBatchDispatch(
                          grp.items.filter(
                            (i) =>
                              i.status === "PENDING_REVIEW" || i.status === "CONFIRMED",
                          ),
                        )
                      }
                      className="h-7 gap-1 px-2.5 text-[11px]"
                    >
                      <Send className="h-3 w-3" />
                      <span>
                        {isVietnamese
                          ? `Giao cả nhóm (${grp.dispatchableIds.length})`
                          : `Dispatch Group (${grp.dispatchableIds.length})`}
                      </span>
                    </Button>
                  )}

                  {canBatchClose && onBatchClose && grp.resolvedIds.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={anyBatchPending}
                      onClick={() =>
                        void onBatchClose(
                          grp.items.filter((i) => i.status === "RESOLVED"),
                        )
                      }
                      className="h-7 gap-1 px-2.5 text-[11px]"
                    >
                      <Archive className="h-3 w-3" />
                      <span>
                        {isVietnamese
                          ? `Đóng nhóm (${grp.resolvedIds.length})`
                          : `Close Group (${grp.resolvedIds.length})`}
                      </span>
                    </Button>
                  )}

                  {canBatchResolve &&
                    !canBatchDispatch &&
                    onBatchResolve &&
                    grp.items.some(
                      (i) =>
                        i.status === "CONFIRMED" &&
                        (!isOfficerRole || isIncidentAssignedToUser(i, currentUserId)),
                    ) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={anyBatchPending}
                        onClick={() =>
                          void onBatchResolve(
                            grp.items.filter(
                              (i) =>
                                i.status === "CONFIRMED" &&
                                (!isOfficerRole ||
                                  isIncidentAssignedToUser(i, currentUserId)),
                            ),
                          )
                        }
                        className="h-7 gap-1 bg-emerald-600 px-2.5 text-[11px] text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                          {isVietnamese ? "Khắc phục nhóm của tôi" : "Resolve My Group"}
                        </span>
                      </Button>
                    )}
                </div>
              </div>

              {!isCollapsed && (
                <div className="divide-y divide-border/20">
                  {grp.items.map((incident) => {
                    const isSelected = selectedIdSet.has(incident.id);
                    const evidenceUrl = getIncidentEvidenceUrl(incident);
                    const assigneeName =
                      incident.assignments?.find((a) => a.status !== "COMPLETED")
                        ?.assignedToName || incident.assignments?.[0]?.assignedToName;
                    return (
                      <div
                        key={incident.id}
                        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 transition ${
                          incident.id === highlightedId
                            ? "bg-danger/10"
                            : isSelected
                              ? "bg-primary/5"
                              : "hover:bg-muted/15"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {canSelectRows && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSingleRow(incident.id)}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded accent-primary"
                            />
                          )}
                          <IncidentThumbnail
                            src={evidenceUrl}
                            hasVideo={incidentHasVideoEvidence(incident)}
                            className="h-10 w-14"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/incidents/${incident.id}`}
                                className="font-mono text-xs font-bold text-primary hover:underline"
                              >
                                #{incident.id.slice(0, 8)}
                              </Link>
                              <span className="text-xs font-semibold text-foreground">
                                {formatViolation(incident.violationType)}
                              </span>
                              <IncidentTelemetryChips incident={incident} />
                              <IncidentSeverityBadge severity={incident.severity} />
                              <IncidentStatusBadge status={incident.status} />
                              {assigneeName && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  <UserCheck className="h-3 w-3 text-primary" />
                                  <span>{assigneeName}</span>
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {new Date(incident.detectedAt).toLocaleString(locale)} •{" "}
                              {incident.description || formatViolation(incident.violationType)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary hover:text-primary"
                          >
                            <span>{isVietnamese ? "Chi tiết" : "Details"}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
