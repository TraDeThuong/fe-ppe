"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Loader2,
  Send,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import { useCan } from "@/hooks/use-can";
import { batchCountLabel, capBatchItems } from "@/lib/incident-actions";
import type { IncidentWorkGroup } from "@/lib/incident-assignment-groups";
import type { IncidentItem } from "@/types";
import { PaginatedIncidentRows } from "./assignment-pagination";
import type {
  AssignmentFormatters,
  AssignmentLoadMoreControls,
  AssignmentResponsibilityContext,
  AssignmentRowActions,
} from "./types";

export interface AssignmentWorkGroupCardProps {
  group: IncidentWorkGroup;
  resetKey: string;
  currentUserId?: string;
  selectedIds?: Set<string>;
  selectable?: boolean;
  defaultExpanded?: boolean;
  allowManagerActions?: boolean;
  allowOfficerResolve?: boolean;
  actionMode: "triage" | "dispatched" | "acceptance" | "admin" | "officer";
  batchReviewPending?: boolean;
  batchActionPending?: boolean;
  onToggleSelectOne?: (id: string) => void;
  onToggleSelectMany?: (ids: string[]) => void;
  onBatchConfirmOnly?: (ids: string[]) => void;
  onBatchDispatch?: (items: IncidentItem[]) => void;
  onBatchClose?: (items: IncidentItem[]) => void;
  onBatchResolve?: (items: IncidentItem[]) => void;
  responsibilityContext: AssignmentResponsibilityContext;
  formatters: AssignmentFormatters;
  rowActions: AssignmentRowActions;
  /** Nút "Tải thêm" của nhóm khi bước còn hồ sơ trên server chưa tải về. */
  loadMore?: AssignmentLoadMoreControls;
}

function getGroupIcon(groupBy: IncidentWorkGroup["groupBy"]) {
  switch (groupBy) {
    case "camera":
      return Camera;
    case "person":
      return Users;
    case "violation":
      return ShieldAlert;
    case "severity":
      return AlertTriangle;
    case "hour":
      return Clock;
    case "shift":
      return CalendarClock;
    case "officer":
      return UserCheck;
    case "site":
      return Building2;
    default:
      return Layers;
  }
}

function getAccentHeaderClass(tone: IncidentWorkGroup["accentTone"]): string {
  switch (tone) {
    case "danger":
      return "border-l-4 border-l-rose-500";
    case "warning":
      return "border-l-4 border-l-amber-500";
    case "success":
      return "border-l-4 border-l-emerald-500";
    case "primary":
      return "border-l-4 border-l-primary";
    default:
      return "";
  }
}

export function AssignmentWorkGroupCard({
  group,
  resetKey,
  currentUserId,
  selectedIds,
  selectable = false,
  defaultExpanded = true,
  allowManagerActions = false,
  allowOfficerResolve = false,
  actionMode,
  batchReviewPending = false,
  batchActionPending = false,
  onToggleSelectOne,
  onToggleSelectMany,
  onBatchConfirmOnly: onBatchConfirmOnlyProp,
  onBatchDispatch: onBatchDispatchProp,
  onBatchClose: onBatchCloseProp,
  onBatchResolve: onBatchResolveProp,
  responsibilityContext,
  formatters,
  rowActions,
  loadMore,
}: AssignmentWorkGroupCardProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  // Nút hàng loạt chỉ hiện khi có đúng permission BE yêu cầu, bất kể role nào render thẻ.
  const can = useCan();
  const canReview = can("PPE_INCIDENT_REVIEW");
  const canManage = can("PPE_INCIDENT_MANAGE");
  const hasPendingInGroup = group.items.some((i) => i.status === "PENDING_REVIEW");
  const onBatchConfirmOnly = canReview ? onBatchConfirmOnlyProp : undefined;
  const onBatchDispatch =
    canManage && (canReview || !hasPendingInGroup) ? onBatchDispatchProp : undefined;
  const onBatchClose = canManage ? onBatchCloseProp : undefined;
  const onBatchResolve = can("PPE_INCIDENT_UPDATE") ? onBatchResolveProp : undefined;
  const [expanded, setExpanded] = useState(defaultExpanded);

  const GroupIcon = getGroupIcon(group.groupBy);
  const allIds = group.items.map((i) => i.id);
  const selectedCount = selectedIds
    ? allIds.filter((id) => selectedIds.has(id)).length
    : 0;
  const allSelected = allIds.length > 0 && selectedCount === allIds.length;

  const dispatchableItems = group.items.filter(
    (i) => i.status === "PENDING_REVIEW" || i.status === "CONFIRMED",
  );
  const closableItems = group.items.filter(
    (i) => i.status === "RESOLVED" || i.status === "DISMISSED",
  );
  const resolvableItems = group.items.filter((i) => i.status === "CONFIRMED");

  const showPersonEstimate =
    group.groupBy !== "person" &&
    group.items.length > 1 &&
    group.estimatedDistinctPersons < group.items.length;

  return (
    <div
      data-testid="assignment-work-group-card"
      data-group-by={group.groupBy}
      className={`overflow-hidden rounded-2xl ${NM.extruded} ${getAccentHeaderClass(group.accentTone)}`}
    >
      <div className="space-y-2.5 border-b border-border/30 bg-muted/20 px-4 py-3">
        {/* Top Row: Select + Collapse + Title + Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {selectable && onToggleSelectMany && (
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleSelectMany(allIds)}
                className="h-4 w-4 shrink-0 cursor-pointer rounded accent-primary"
                aria-label={`Select group ${group.title}`}
              />
            )}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex min-w-0 items-center gap-2.5 text-left"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <GroupIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-extrabold text-foreground">
                    {group.title}
                  </span>
                  <span className="rounded-full border border-border/50 bg-background px-2 py-0.5 font-mono text-[10.5px] font-extrabold text-foreground">
                    {group.total} {isVietnamese ? "sự cố" : "incidents"}
                  </span>
                  {group.personMeta?.isMultiViolation && (
                    <span className="rounded-full border border-rose-500/35 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                      {isVietnamese ? "Đa vi phạm PPE" : "Multi-PPE"}
                    </span>
                  )}
                </div>
                {group.subtitle && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    {group.subtitle}
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* 1-click Group Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            {actionMode === "triage" && (
              <>
                {group.pendingIds.length > 0 && onBatchConfirmOnly && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={batchReviewPending}
                    onClick={() => onBatchConfirmOnly(group.pendingIds)}
                    className="h-7 gap-1 px-2.5 text-[11px]"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>
                      {isVietnamese
                        ? `Xác nhận nhóm (${group.pendingIds.length})`
                        : `Confirm (${group.pendingIds.length})`}
                    </span>
                  </Button>
                )}
                {onBatchDispatch && group.items.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={batchActionPending}
                    onClick={() => onBatchDispatch(capBatchItems(group.items))}
                    className="h-7 gap-1 px-2.5 text-[11px]"
                  >
                    <Send className="h-3 w-3" />
                    <span>
                      {isVietnamese
                        ? `Duyệt & Giao cả nhóm ${batchCountLabel(group.items.length)}`
                        : `Dispatch Group ${batchCountLabel(group.items.length)}`}
                    </span>
                  </Button>
                )}
              </>
            )}

            {actionMode === "dispatched" && onBatchDispatch && group.items.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={batchActionPending}
                onClick={() => onBatchDispatch(capBatchItems(group.items))}
                className="h-7 gap-1 px-2.5 text-[11px]"
              >
                <UserCheck className="h-3 w-3" />
                <span>
                  {isVietnamese
                    ? `Đổi Officer cho nhóm ${batchCountLabel(group.items.length)}`
                    : `Reassign Group ${batchCountLabel(group.items.length)}`}
                </span>
              </Button>
            )}

            {actionMode === "acceptance" && onBatchClose && group.items.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={batchActionPending}
                onClick={() => onBatchClose(capBatchItems(group.items))}
                className="h-7 gap-1 bg-emerald-600 px-2.5 text-[11px] text-white hover:bg-emerald-700"
              >
                <Archive className="h-3 w-3" />
                <span>
                  {isVietnamese
                    ? `Nghiệm thu & Đóng nhóm ${batchCountLabel(group.items.length)}`
                    : `Close Group ${batchCountLabel(group.items.length)}`}
                </span>
              </Button>
            )}

            {actionMode === "admin" && (
              <>
                {dispatchableItems.length > 0 && onBatchDispatch && (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={batchActionPending}
                    onClick={() => onBatchDispatch(capBatchItems(dispatchableItems))}
                    className="h-7 gap-1 px-2.5 text-[11px]"
                  >
                    <Send className="h-3 w-3" />
                    <span>
                      {isVietnamese
                        ? `Giao cả nhóm ${batchCountLabel(dispatchableItems.length)}`
                        : `Dispatch ${batchCountLabel(dispatchableItems.length)}`}
                    </span>
                  </Button>
                )}
                {closableItems.length > 0 && onBatchClose && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={batchActionPending}
                    onClick={() => onBatchClose(closableItems)}
                    className="h-7 gap-1 px-2.5 text-[11px]"
                  >
                    <Archive className="h-3 w-3" />
                    <span>
                      {isVietnamese
                        ? `Đóng thay (${closableItems.length})`
                        : `Close (${closableItems.length})`}
                    </span>
                  </Button>
                )}
              </>
            )}

            {actionMode === "officer" &&
              allowOfficerResolve &&
              resolvableItems.length > 0 &&
              onBatchResolve && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={batchActionPending}
                  onClick={() => onBatchResolve(resolvableItems)}
                  className="h-7 gap-1 bg-emerald-600 px-2.5 text-[11px] text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>
                    {isVietnamese
                      ? `Khắc phục cả nhóm (${resolvableItems.length})`
                      : `Resolve Group (${resolvableItems.length})`}
                  </span>
                </Button>
              )}
          </div>
        </div>

        {/* Row 2: Rich Breakdown Chips (Severity + Violation Types + Estimated Distinct Persons) */}
        <div className="flex flex-wrap items-center gap-1.5 pl-1 text-[10.5px]">
          {group.severityCounts.CRITICAL > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/35 bg-rose-500/12 px-2 py-0.5 font-bold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>
                {group.severityCounts.CRITICAL}{" "}
                {isVietnamese ? "Khẩn cấp" : "Critical"}
              </span>
            </span>
          )}
          {group.severityCounts.HIGH > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 font-bold text-amber-700 dark:text-amber-300">
              <span>
                {group.severityCounts.HIGH} {isVietnamese ? "Cao" : "High"}
              </span>
            </span>
          )}
          {group.severityCounts.MEDIUM > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700 dark:text-sky-300">
              <span>
                {group.severityCounts.MEDIUM}{" "}
                {isVietnamese ? "Trung bình" : "Medium"}
              </span>
            </span>
          )}

          {group.violationBreakdown.slice(0, 4).map((vb) => (
            <span
              key={vb.type}
              className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background px-2 py-0.5 font-semibold text-foreground/90"
            >
              <ShieldAlert className="h-2.5 w-2.5 text-danger" />
              <span>
                {vb.count} {formatters.formatViolation(vb.type)}
              </span>
            </span>
          ))}

          {showPersonEstimate && (
            <span
              title={
                isVietnamese
                  ? "Số đối tượng ước tính sau khi gom các bản ghi trùng Track ID / vị trí"
                  : "Estimated distinct workers after deduplicating Track ID / BBox IoU"
              }
              className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300"
            >
              <Users className="h-2.5 w-2.5" />
              <span>
                {isVietnamese
                  ? `≈ ${group.estimatedDistinctPersons} đối tượng / ${group.items.length} bản ghi`
                  : `≈ ${group.estimatedDistinctPersons} persons / ${group.items.length} records`}
              </span>
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <PaginatedIncidentRows
          incidents={group.items}
          defaultPageSize={5}
          pageSizeOptions={[5, 10, 20, 50]}
          resetKey={`${resetKey}:${group.key}`}
          currentUserId={currentUserId}
          selectedIds={selectedIds}
          selectable={selectable}
          showResponsibility
          allowManagerActions={allowManagerActions}
          allowOfficerResolve={allowOfficerResolve}
          onToggleSelect={onToggleSelectOne}
          responsibilityContext={responsibilityContext}
          formatters={formatters}
          actions={rowActions}
        />
      )}

      {expanded && loadMore?.canLoad(group) && (
        <div className="flex justify-center border-t border-border/20 px-4 py-2.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loadMore.isLoading(group)}
            onClick={() => loadMore.onLoad(group)}
            className="gap-1.5 text-xs"
          >
            {loadMore.isLoading(group) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isVietnamese ? "Tải thêm" : "Load more"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
