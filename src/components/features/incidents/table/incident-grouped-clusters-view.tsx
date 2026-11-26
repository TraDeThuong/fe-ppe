"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TableBulkAction } from "@/components/ui/table";
import type { IncidentCluster } from "@/lib/incident-cluster-engine";
import type { IncidentItem } from "@/types";
import { IncidentSeverityBadge } from "../incident-severity-badge";
import { IncidentStatusBadge } from "../incident-status-badge";
import { getIncidentEvidenceUrl } from "../incident-table";
import {
  incidentHasVideoEvidence,
  IncidentTelemetryChips,
  IncidentThumbnail,
} from "./incident-thumbnail";

export interface IncidentGroupedClustersViewProps {
  toolbar?: ReactNode;
  personClusters: IncidentCluster[];
  selectedIdSet: Set<string>;
  bulkActions: TableBulkAction[];
  canSelectRows: boolean;
  canBatchDispatch: boolean;
  canBatchClose: boolean;
  anyBatchPending: boolean;
  isVietnamese: boolean;
  locale: string;
  highlightedId?: string | null;
  collapsedMap: Record<string, boolean>;
  onToggleCollapse: (key: string) => void;
  onToggleGroupSelection: (ids: string[]) => void;
  onToggleSingleRow: (id: string) => void;
  onBatchDispatch?: (items: IncidentItem[]) => Promise<void> | void;
  onBatchClose?: (items: IncidentItem[]) => Promise<void> | void;
  getSiteName: (siteId?: string | null) => string;
  getCameraCode: (cameraId?: string | null) => string;
  getCameraName: (cameraId?: string | null) => string;
  formatViolation: (type: string) => string;
}

export function IncidentGroupedClustersView({
  toolbar,
  personClusters,
  selectedIdSet,
  bulkActions,
  canSelectRows,
  canBatchDispatch,
  canBatchClose,
  anyBatchPending,
  isVietnamese,
  locale,
  highlightedId,
  collapsedMap,
  onToggleCollapse,
  onToggleGroupSelection,
  onToggleSingleRow,
  onBatchDispatch,
  onBatchClose,
  getSiteName,
  getCameraCode,
  getCameraName,
  formatViolation,
}: IncidentGroupedClustersViewProps) {
  return (
    <div className="space-y-4">
      {toolbar}

      {selectedIdSet.size > 0 && bulkActions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2.5 shadow-sm">
          <span className="text-xs font-bold text-foreground">
            {isVietnamese
              ? `Đang chọn ${selectedIdSet.size} bản ghi sự cố`
              : `${selectedIdSet.size} incident records selected`}
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
        {personClusters.map((cluster) => {
          const allIds = cluster.incidentIds;
          const selectedInCluster = allIds.filter((id) => selectedIdSet.has(id)).length;
          const isAllSelected = selectedInCluster === allIds.length && allIds.length > 0;
          const collapseKey = `cl:${cluster.clusterId}`;
          const isCollapsed = Boolean(collapsedMap[collapseKey]);
          const primary = cluster.primary;
          const siteName = primary.siteName || getSiteName(primary.siteId);
          const cameraCode = primary.cameraCode || getCameraCode(primary.cameraId);
          const cameraName = primary.cameraName || getCameraName(primary.cameraId);
          const cameraLabel =
            cameraName && cameraName !== cameraCode
              ? `${cameraCode} (${cameraName})`
              : cameraCode || primary.cameraId.slice(0, 8);
          const dispatchable = cluster.items.filter(
            (i) => i.status === "PENDING_REVIEW" || i.status === "CONFIRMED",
          );
          const resolvedItems = cluster.items.filter((i) => i.status === "RESOLVED");

          return (
            <div
              key={cluster.clusterId}
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
                      aria-label={`Select cluster ${cluster.clusterId}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleCollapse(collapseKey)}
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Layers className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-foreground">
                          {formatViolation(cluster.effectiveViolationType)}
                        </span>
                        {cluster.rawCount > 1 && (
                          <span className="rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-warning">
                            {cluster.rawCount} {isVietnamese ? "lỗi gốc" : "raw"}
                          </span>
                        )}
                        {cluster.personTrackId !== null && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                            Track #{cluster.personTrackId}
                          </span>
                        )}
                        <IncidentSeverityBadge severity={cluster.effectiveSeverity} />
                        <IncidentStatusBadge status={cluster.effectiveStatus} />
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{siteName}</span>
                        <span>•</span>
                        <span className="font-semibold text-foreground/80">{cameraLabel}</span>
                        <span>•</span>
                        <span>{new Date(cluster.latestDetectedAt).toLocaleString(locale)}</span>
                        {cluster.isMultiViolation && cluster.violationCodes.length > 1 && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-warning">
                              {cluster.violationCodes.map(formatViolation).join(" + ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {canBatchDispatch && onBatchDispatch && dispatchable.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={anyBatchPending}
                      onClick={() => void onBatchDispatch(dispatchable)}
                      className="h-7 gap-1 px-2.5 text-[11px]"
                    >
                      <Send className="h-3 w-3" />
                      <span>
                        {isVietnamese
                          ? `Giao cụm (${dispatchable.length})`
                          : `Dispatch (${dispatchable.length})`}
                      </span>
                    </Button>
                  )}
                  {canBatchClose && onBatchClose && resolvedItems.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={anyBatchPending}
                      onClick={() => void onBatchClose(resolvedItems)}
                      className="h-7 gap-1 px-2.5 text-[11px]"
                    >
                      <Archive className="h-3 w-3" />
                      <span>
                        {isVietnamese
                          ? `Đóng cụm (${resolvedItems.length})`
                          : `Close (${resolvedItems.length})`}
                      </span>
                    </Button>
                  )}
                  <Link
                    href={`/incidents/${primary.id}`}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/50 px-2.5 text-[11px] font-semibold text-foreground transition hover:border-primary hover:text-primary"
                  >
                    <span>{isVietnamese ? "Chi tiết" : "Details"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {!isCollapsed && (
                <div className="divide-y divide-border/20">
                  {cluster.items.map((incident) => {
                    const isSelected = selectedIdSet.has(incident.id);
                    const evidenceUrl = getIncidentEvidenceUrl(incident);
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
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {new Date(incident.detectedAt).toLocaleString(locale)} •{" "}
                              {incident.description || formatViolation(incident.violationType)}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/incidents/${incident.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary hover:text-primary"
                        >
                          <span>{isVietnamese ? "Mở" : "Open"}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
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
