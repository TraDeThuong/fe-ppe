"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CheckSquare, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import { useCan } from "@/hooks/use-can";
import {
  filterAssignmentIncidents,
  groupIncidentsForAssignment,
  type AssignmentGroupBy,
} from "@/lib/incident-assignment-groups";
import type { ResponsiblePersonRef } from "@/lib/incident-workflow";
import type { IncidentItem } from "@/types";
import {
  AssignmentGroupToolbar,
  type GroupModeOption,
} from "./assignment-group-toolbar";
import { AssignmentIncidentRow } from "./assignment-incident-row";
import {
  AssignmentPagination,
  useClientPagination,
} from "./assignment-pagination";
import { AssignmentWorkGroupCard } from "./assignment-work-group-card";
import { DispatchedGroupCard } from "./dispatched-group-card";
import type {
  AssignmentFilterState,
  AssignmentFormatters,
  AssignmentResponsibilityContext,
  AssignmentRowActions,
  CategorizedAssignments,
  DispatchedGroupView,
  OfficerGroupMode,
  OfficerTabKey,
} from "./types";

const OFFICER_MODE_STORAGE_KEY = "ppe.assignments.officer-group-mode.v1";

const OFFICER_MODE_OPTIONS: ReadonlyArray<GroupModeOption<OfficerGroupMode>> = [
  { key: "flat", vi: "Từng dòng", en: "Flat list" },
  { key: "camera", vi: "Camera / Vị trí đi tuần", en: "Camera / Patrol Zone" },
  { key: "severity", vi: "Mức độ ưu tiên", en: "Priority" },
  { key: "person", vi: "Đối tượng & Đa vi phạm", en: "Person & Multi-PPE" },
  { key: "violation", vi: "Loại vi phạm", en: "Violation" },
  { key: "hour", vi: "Khung giờ", en: "By Hour" },
  { key: "shift", vi: "Ca trực", en: "By Shift" },
];

export interface OfficerTasksWorkspaceProps {
  officerTab: OfficerTabKey;
  categorized: CategorizedAssignments;
  dispatchedGroups: DispatchedGroupView[];
  usersById: ReadonlyMap<string, ResponsiblePersonRef>;
  selectedIds: Set<string>;
  onToggleSelectOne: (id: string) => void;
  onToggleSelectMany: (ids: string[]) => void;
  batchActionPending: boolean;
  onBatchResolve: (items: IncidentItem[]) => void;
  currentUserId?: string;
  responsibilityContext: AssignmentResponsibilityContext;
  formatters: AssignmentFormatters;
  rowActions: AssignmentRowActions;
  initialGroupMode?: OfficerGroupMode;
}

export function OfficerTasksWorkspace({
  officerTab,
  categorized,
  dispatchedGroups,
  usersById,
  selectedIds,
  onToggleSelectOne,
  onToggleSelectMany,
  batchActionPending,
  onBatchResolve,
  currentUserId,
  responsibilityContext,
  formatters,
  rowActions,
  initialGroupMode,
}: OfficerTasksWorkspaceProps) {
  const { locale } = useLocale();
  const canResolve = useCan()("PPE_INCIDENT_UPDATE");
  const isVietnamese = locale === "vi-VN";

  const [groupMode, setGroupMode] = useState<OfficerGroupMode>(
    initialGroupMode ?? "flat",
  );
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [filter, setFilter] = useState<AssignmentFilterState>({
    violationType: "",
    severity: "",
    search: "",
  });

  useEffect(() => {
    if (initialGroupMode) {
      setPrefsLoaded(true);
      return;
    }
    try {
      const saved = localStorage.getItem(
        OFFICER_MODE_STORAGE_KEY,
      ) as OfficerGroupMode | null;
      if (saved && OFFICER_MODE_OPTIONS.some((o) => o.key === saved)) {
        setGroupMode(saved);
      }
    } catch {
      // Ignore storage errors
    } finally {
      setPrefsLoaded(true);
    }
  }, [initialGroupMode]);

  useEffect(() => {
    if (!prefsLoaded || initialGroupMode) return;
    try {
      localStorage.setItem(OFFICER_MODE_STORAGE_KEY, groupMode);
    } catch {
      // Ignore storage errors
    }
  }, [prefsLoaded, initialGroupMode, groupMode]);

  const rawItems =
    officerTab === "pending"
      ? categorized.myActiveConfirmed
      : categorized.myCompleted;

  const activeItems = useMemo(
    () =>
      filterAssignmentIncidents(rawItems, filter, {
        resolveSiteLabel: formatters.resolveSiteLabel,
        resolveCameraLabel: formatters.resolveCameraLabel,
        formatViolation: formatters.formatViolation,
        responsibilityContext,
      }),
    [rawItems, filter, formatters, responsibilityContext],
  );

  const activeIds = activeItems.map((i) => i.id);
  const selectedMyItems = activeItems.filter(
    (i) => officerTab === "pending" && selectedIds.has(i.id),
  );
  const allMyPendingSelected =
    officerTab === "pending" &&
    activeItems.length > 0 &&
    activeItems.every((i) => selectedIds.has(i.id));

  const workGroups = useMemo(() => {
    if (groupMode === "flat") return [];
    return groupIncidentsForAssignment(
      activeItems,
      groupMode as AssignmentGroupBy,
      {
        isVietnamese,
        resolveSiteLabel: formatters.resolveSiteLabel,
        resolveCameraLabel: formatters.resolveCameraLabel,
        formatViolation: formatters.formatViolation,
        responsibilityContext,
      },
    );
  }, [activeItems, groupMode, isVietnamese, formatters, responsibilityContext]);

  const groupsPage = useClientPagination(dispatchedGroups, {
    defaultPageSize: 4,
    resetKey: "officer-groups",
  });

  const resetKey = `${officerTab}:${groupMode}:${filter.violationType}:${filter.severity}:${filter.search}`;
  const incidentsPage = useClientPagination(activeItems, {
    defaultPageSize: 10,
    resetKey,
  });
  const workGroupsPage = useClientPagination(workGroups, {
    defaultPageSize: 5,
    resetKey,
  });

  return (
    <div className="space-y-6">
      {/* Khối 1: Các Nhóm sự cố được Manager điều phối (Dispatch Groups) */}
      {dispatchedGroups.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <ListChecks className="h-4 w-4 text-primary" />
            <span>
              {isVietnamese
                ? `Các Nhóm sự cố được Quản lý điều phối cho bạn (${dispatchedGroups.length} nhóm)`
                : `Incident Groups Dispatched to You (${dispatchedGroups.length})`}
            </span>
          </h3>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            {groupsPage.items.map((entry) => (
              <DispatchedGroupCard
                key={entry.group.groupId}
                entry={entry}
                usersById={usersById}
                formatters={formatters}
                onBatchResolve={onBatchResolve}
              />
            ))}
          </div>

          <AssignmentPagination
            page={groupsPage.page}
            pageCount={groupsPage.pageCount}
            pageSize={groupsPage.pageSize}
            totalItems={groupsPage.totalItems}
            startIndex={groupsPage.startIndex}
            endIndex={groupsPage.endIndex}
            onPageChange={groupsPage.setPage}
            onPageSizeChange={groupsPage.setPageSize}
            pageSizeOptions={[4, 8, 12]}
            variant="standalone"
            itemLabel={{ vi: "nhóm điều phối", en: "dispatch groups" }}
            hideIfSinglePageAndSmall
          />
        </section>
      )}

      {/* Khối 2: Danh sách Sự cố được giao cho tôi + Tùy chọn gom nhóm */}
      <section className="space-y-3">
        <AssignmentGroupToolbar
          groupMode={groupMode}
          onGroupModeChange={setGroupMode}
          options={OFFICER_MODE_OPTIONS}
          filter={filter}
          onFilterChange={setFilter}
          summaryText={
            groupMode === "flat"
              ? isVietnamese
                ? `${activeItems.length}/${rawItems.length} sự cố`
                : `${activeItems.length}/${rawItems.length} incidents`
              : isVietnamese
                ? `${workGroups.length} nhóm • ${activeItems.length} sự cố`
                : `${workGroups.length} groups • ${activeItems.length} incidents`
          }
        />

        {officerTab === "pending" && activeItems.length > 0 && (
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 ${NM.extruded}`}
          >
            <span className="text-xs font-bold text-foreground">
              {isVietnamese
                ? `Thao tác nhanh trên ${activeItems.length} sự cố cần khắc phục`
                : `Quick actions for ${activeItems.length} pending incidents`}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onToggleSelectMany(activeIds)}
                className="gap-1.5 text-xs"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>
                  {allMyPendingSelected
                    ? isVietnamese
                      ? "Bỏ chọn tất cả"
                      : "Deselect all"
                    : isVietnamese
                      ? `Chọn tất cả việc của tôi (${activeItems.length})`
                      : `Select all my tasks (${activeItems.length})`}
                </span>
              </Button>

              {canResolve && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={selectedMyItems.length === 0 || batchActionPending}
                onClick={() => onBatchResolve(selectedMyItems)}
                className="gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {isVietnamese
                    ? `Báo cáo khắc phục hàng loạt (${selectedMyItems.length})`
                    : `Batch Report Resolved (${selectedMyItems.length})`}
                </span>
              </Button>
              )}
            </div>
          </div>
        )}

        {activeItems.length === 0 ? (
          <div
            className={`space-y-2 rounded-2xl p-10 text-center ${NM.recessed}`}
          >
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="text-sm font-bold text-foreground">
              {officerTab === "pending"
                ? isVietnamese
                  ? "Hiện tại bạn không có sự cố nào đang chờ khắc phục"
                  : "You have no assigned incidents awaiting remediation"
                : isVietnamese
                  ? "Chưa có lịch sử sự cố đã khắc phục"
                  : "No remediated incidents yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isVietnamese
                ? "Các sự cố mới do Camera AI phát hiện sẽ do Safety Manager thẩm duyệt trước khi điều phối cho bạn."
                : "New AI-detected incidents are reviewed by the Safety Manager before being dispatched to you."}
            </p>
          </div>
        ) : groupMode === "flat" ? (
          <div className={`overflow-hidden rounded-2xl ${NM.extruded}`}>
            <div className="divide-y divide-border/20">
              {incidentsPage.items.map((inc) => (
                <AssignmentIncidentRow
                  key={inc.id}
                  incident={inc}
                  currentUserId={currentUserId}
                  selected={selectedIds.has(inc.id)}
                  selectable={officerTab === "pending"}
                  showResponsibility
                  allowOfficerResolve={officerTab === "pending"}
                  onToggleSelect={onToggleSelectOne}
                  responsibilityContext={responsibilityContext}
                  formatters={formatters}
                  actions={rowActions}
                />
              ))}
            </div>

            <AssignmentPagination
              page={incidentsPage.page}
              pageCount={incidentsPage.pageCount}
              pageSize={incidentsPage.pageSize}
              totalItems={incidentsPage.totalItems}
              startIndex={incidentsPage.startIndex}
              endIndex={incidentsPage.endIndex}
              onPageChange={incidentsPage.setPage}
              onPageSizeChange={incidentsPage.setPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              variant="embedded"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {workGroupsPage.items.map((grp) => (
              <AssignmentWorkGroupCard
                key={grp.key}
                group={grp}
                resetKey={resetKey}
                currentUserId={currentUserId}
                selectedIds={selectedIds}
                selectable={officerTab === "pending"}
                allowOfficerResolve={officerTab === "pending"}
                actionMode="officer"
                batchActionPending={batchActionPending}
                onToggleSelectOne={onToggleSelectOne}
                onToggleSelectMany={onToggleSelectMany}
                onBatchResolve={onBatchResolve}
                responsibilityContext={responsibilityContext}
                formatters={formatters}
                rowActions={rowActions}
              />
            ))}

            <AssignmentPagination
              page={workGroupsPage.page}
              pageCount={workGroupsPage.pageCount}
              pageSize={workGroupsPage.pageSize}
              totalItems={workGroupsPage.totalItems}
              startIndex={workGroupsPage.startIndex}
              endIndex={workGroupsPage.endIndex}
              onPageChange={workGroupsPage.setPage}
              onPageSizeChange={workGroupsPage.setPageSize}
              pageSizeOptions={[3, 5, 10, 20]}
              variant="standalone"
              itemLabel={{ vi: "nhóm công việc", en: "task groups" }}
              hideIfSinglePageAndSmall
            />
          </div>
        )}
      </section>
    </div>
  );
}
