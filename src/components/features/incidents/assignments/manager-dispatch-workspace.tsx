"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  CheckSquare,
  Clock,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import {
  filterAssignmentIncidents,
  groupIncidentsForAssignment,
  type AssignmentGroupBy,
} from "@/lib/incident-assignment-groups";
import type { ResponsiblePersonRef } from "@/lib/incident-workflow";
import type { IncidentItem, SiteItem } from "@/types";
import {
  AssignmentGroupToolbar,
  type GroupModeOption,
} from "./assignment-group-toolbar";
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
  ManagerGroupMode,
  ManagerTabKey,
} from "./types";

const STORAGE_KEY = "ppe.assignments.manager-group-modes.v1";

const DEFAULT_TAB_MODES: Record<ManagerTabKey, ManagerGroupMode> = {
  triage: "camera",
  dispatched: "officer",
  acceptance: "officer",
};

const TAB_MODE_OPTIONS: Record<
  ManagerTabKey,
  ReadonlyArray<GroupModeOption<ManagerGroupMode>>
> = {
  triage: [
    { key: "camera", vi: "Camera", en: "Camera" },
    { key: "person", vi: "Đối tượng & Đa vi phạm", en: "Person & Multi-PPE" },
    { key: "severity", vi: "Mức độ khẩn cấp", en: "Severity" },
    { key: "violation", vi: "Loại vi phạm", en: "Violation" },
    { key: "hour", vi: "Khung giờ", en: "By Hour" },
    { key: "shift", vi: "Ca trực", en: "By Shift" },
  ],
  dispatched: [
    { key: "officer", vi: "Cán bộ phụ trách", en: "Assigned Officer" },
    { key: "batches", vi: "Đợt giao việc", en: "Dispatch Batches" },
    { key: "camera", vi: "Camera", en: "Camera" },
    { key: "severity", vi: "Mức độ khẩn cấp", en: "Severity" },
    { key: "violation", vi: "Loại vi phạm", en: "Violation" },
    { key: "hour", vi: "Khung giờ", en: "By Hour" },
    { key: "shift", vi: "Ca trực", en: "By Shift" },
  ],
  acceptance: [
    { key: "officer", vi: "Cán bộ đã báo cáo", en: "Reporting Officer" },
    { key: "camera", vi: "Camera", en: "Camera" },
    { key: "violation", vi: "Loại vi phạm", en: "Violation" },
    { key: "hour", vi: "Khung giờ", en: "By Hour" },
    { key: "shift", vi: "Ca trực", en: "By Shift" },
  ],
};

export interface ManagerDispatchWorkspaceProps {
  managerTab: ManagerTabKey;
  categorized: CategorizedAssignments;
  dispatchedGroups?: DispatchedGroupView[];
  usersById?: ReadonlyMap<string, ResponsiblePersonRef>;
  siteFilter: string;
  onSiteChange: (siteId: string) => void;
  sites: SiteItem[];
  selectedIds: Set<string>;
  onToggleSelectOne: (id: string) => void;
  onToggleSelectMany: (ids: string[]) => void;
  batchReviewPending: boolean;
  batchActionPending: boolean;
  onBatchConfirmOnly: (ids: string[]) => void;
  onBatchReject: (ids: string[]) => void;
  onBatchDispatch: (items: IncidentItem[]) => void;
  onBatchClose: (items: IncidentItem[]) => void;
  currentUserId?: string;
  responsibilityContext: AssignmentResponsibilityContext;
  formatters: AssignmentFormatters;
  rowActions: AssignmentRowActions;
  /** Override chế độ gom ban đầu (hữu ích cho test hoặc deep link) */
  initialGroupMode?: ManagerGroupMode;
}

export function ManagerDispatchWorkspace({
  managerTab,
  categorized,
  dispatchedGroups = [],
  usersById = new Map(),
  siteFilter,
  onSiteChange,
  sites,
  selectedIds,
  onToggleSelectOne,
  onToggleSelectMany,
  batchReviewPending,
  batchActionPending,
  onBatchConfirmOnly,
  onBatchReject,
  onBatchDispatch,
  onBatchClose,
  currentUserId,
  responsibilityContext,
  formatters,
  rowActions,
  initialGroupMode,
}: ManagerDispatchWorkspaceProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [tabModes, setTabModes] = useState<Record<ManagerTabKey, ManagerGroupMode>>(
    () => ({
      ...DEFAULT_TAB_MODES,
      ...(initialGroupMode ? { [managerTab]: initialGroupMode } : {}),
    }),
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
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<
        Record<ManagerTabKey, ManagerGroupMode>
      > | null;
      if (saved && typeof saved === "object") {
        setTabModes((prev) => ({
          triage: TAB_MODE_OPTIONS.triage.some((o) => o.key === saved.triage)
            ? (saved.triage as ManagerGroupMode)
            : prev.triage,
          dispatched: TAB_MODE_OPTIONS.dispatched.some(
            (o) => o.key === saved.dispatched,
          )
            ? (saved.dispatched as ManagerGroupMode)
            : prev.dispatched,
          acceptance: TAB_MODE_OPTIONS.acceptance.some(
            (o) => o.key === saved.acceptance,
          )
            ? (saved.acceptance as ManagerGroupMode)
            : prev.acceptance,
        }));
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabModes));
    } catch {
      // Ignore storage errors
    }
  }, [prefsLoaded, initialGroupMode, tabModes]);

  const currentMode = tabModes[managerTab] ?? DEFAULT_TAB_MODES[managerTab];

  const rawTabItems =
    managerTab === "triage"
      ? categorized.triageItems
      : managerTab === "dispatched"
        ? categorized.assignedConfirmed
        : categorized.awaitingAcceptance;

  const activeItems = useMemo(
    () =>
      filterAssignmentIncidents(rawTabItems, filter, {
        resolveSiteLabel: formatters.resolveSiteLabel,
        resolveCameraLabel: formatters.resolveCameraLabel,
        formatViolation: formatters.formatViolation,
        responsibilityContext,
      }),
    [rawTabItems, filter, formatters, responsibilityContext],
  );

  const activeIds = activeItems.map((i) => i.id);
  const selectedInTab = activeItems.filter((i) => selectedIds.has(i.id));
  const pendingInSelected = selectedInTab
    .filter((i) => i.status === "PENDING_REVIEW")
    .map((i) => i.id);
  const pendingInActive = activeItems.filter((i) => i.status === "PENDING_REVIEW");
  const allTabSelected =
    activeIds.length > 0 && activeIds.every((id) => selectedIds.has(id));

  const workGroups = useMemo(() => {
    if (currentMode === "batches") return [];
    return groupIncidentsForAssignment(
      activeItems,
      currentMode as AssignmentGroupBy,
      {
        isVietnamese,
        resolveSiteLabel: formatters.resolveSiteLabel,
        resolveCameraLabel: formatters.resolveCameraLabel,
        formatViolation: formatters.formatViolation,
        responsibilityContext,
      },
    );
  }, [activeItems, currentMode, isVietnamese, formatters, responsibilityContext]);

  const filteredBatches = useMemo(() => {
    if (currentMode !== "batches") return [];
    const q = filter.search.trim().toLocaleLowerCase();
    return dispatchedGroups.filter((dg) => {
      if (
        filter.violationType &&
        !dg.memberIncidents.some(
          (i) => (i.violationType || "").toUpperCase() === filter.violationType,
        )
      ) {
        return false;
      }
      if (
        filter.severity &&
        !dg.memberIncidents.some(
          (i) => (i.severity || "").toUpperCase() === filter.severity,
        )
      ) {
        return false;
      }
      if (q) {
        const officerName = usersById.get(dg.group.assignedTo)?.name || "";
        const hay = `${dg.group.groupId} ${dg.message} ${officerName}`.toLocaleLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [currentMode, dispatchedGroups, filter, usersById]);

  const resetKey = `${managerTab}:${currentMode}:${siteFilter}:${filter.violationType}:${filter.severity}:${filter.search}`;
  const groupsPage = useClientPagination(workGroups, {
    defaultPageSize: 5,
    resetKey,
  });
  const batchesPage = useClientPagination(filteredBatches, {
    defaultPageSize: 6,
    resetKey: `batches:${resetKey}`,
  });

  const modeOptions = useMemo(
    () =>
      TAB_MODE_OPTIONS[managerTab].map((opt) =>
        opt.key === "batches"
          ? { ...opt, count: dispatchedGroups.length }
          : opt,
      ),
    [managerTab, dispatchedGroups.length],
  );

  return (
    <div className="space-y-4">
      {/* 1. Thanh Tùy chọn Phân nhóm & Bộ lọc Nhanh */}
      <AssignmentGroupToolbar
        groupMode={currentMode}
        onGroupModeChange={(nextMode) =>
          setTabModes((prev) => ({ ...prev, [managerTab]: nextMode }))
        }
        options={modeOptions}
        filter={filter}
        onFilterChange={setFilter}
        siteFilter={siteFilter}
        onSiteChange={onSiteChange}
        sites={sites}
        summaryText={
          currentMode === "batches"
            ? isVietnamese
              ? `${filteredBatches.length} đợt điều phối`
              : `${filteredBatches.length} dispatch batches`
            : isVietnamese
              ? `${workGroups.length} nhóm • ${activeItems.length}/${rawTabItems.length} sự cố`
              : `${workGroups.length} groups • ${activeItems.length}/${rawTabItems.length} incidents`
        }
      />

      {/* 2. Thanh Thao tác Hàng loạt (Bulk Action Bar) */}
      {currentMode !== "batches" && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 p-3.5 ${NM.extruded}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={allTabSelected ? "primary" : "outline"}
              disabled={activeIds.length === 0}
              onClick={() => onToggleSelectMany(activeIds)}
              className="gap-1.5 text-xs"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>
                {allTabSelected
                  ? isVietnamese
                    ? `Bỏ chọn tất cả (${activeIds.length})`
                    : `Deselect all (${activeIds.length})`
                  : isVietnamese
                    ? `Chọn tất cả trong bước này (${activeIds.length})`
                    : `Select all in this step (${activeIds.length})`}
              </span>
            </Button>

            {managerTab === "triage" && pendingInActive.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onToggleSelectMany(pendingInActive.map((i) => i.id))
                }
                className="gap-1.5 text-xs text-warning"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {isVietnamese
                    ? `Chọn riêng Chờ duyệt AI (${pendingInActive.length})`
                    : `Select Pending Review (${pendingInActive.length})`}
                </span>
              </Button>
            )}
          </div>

          {/* Cụm nút hành động hàng loạt theo từng Bước */}
          <div className="flex flex-wrap items-center gap-2">
            {managerTab === "triage" && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={selectedInTab.length === 0 || batchActionPending}
                  onClick={() => onBatchDispatch(selectedInTab)}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {isVietnamese
                      ? `Duyệt & Giao Officer (${selectedInTab.length})`
                      : `Confirm & Dispatch (${selectedInTab.length})`}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pendingInSelected.length === 0 || batchReviewPending}
                  onClick={() => onBatchConfirmOnly(pendingInSelected)}
                  className="gap-1.5 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {isVietnamese
                      ? `Chỉ Xác nhận (${pendingInSelected.length})`
                      : `Confirm Only (${pendingInSelected.length})`}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pendingInSelected.length === 0 || batchReviewPending}
                  onClick={() => onBatchReject(pendingInSelected)}
                  className="gap-1.5 text-xs text-danger hover:text-danger"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>
                    {isVietnamese
                      ? `Báo nhầm (${pendingInSelected.length})`
                      : `Dismiss (${pendingInSelected.length})`}
                  </span>
                </Button>
              </>
            )}

            {managerTab === "dispatched" && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={selectedInTab.length === 0 || batchActionPending}
                onClick={() => onBatchDispatch(selectedInTab)}
                className="gap-1.5 text-xs font-bold"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>
                  {isVietnamese
                    ? `Đổi Officer phụ trách (${selectedInTab.length})`
                    : `Reassign Officer (${selectedInTab.length})`}
                </span>
              </Button>
            )}

            {managerTab === "acceptance" && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={selectedInTab.length === 0 || batchActionPending}
                onClick={() => onBatchClose(selectedInTab)}
                className="gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>
                  {isVietnamese
                    ? `Nghiệm thu & Đóng hàng loạt (${selectedInTab.length})`
                    : `Accept & Close Selected (${selectedInTab.length})`}
                </span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 3. Nội dung nhóm theo chế độ đã chọn */}
      {currentMode === "batches" ? (
        filteredBatches.length === 0 ? (
          <div
            className={`space-y-2 rounded-2xl p-10 text-center ${NM.recessed}`}
          >
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="text-sm font-bold text-foreground">
              {isVietnamese
                ? "Chưa có đợt điều phối nhóm nào khớp bộ lọc"
                : "No dispatched batch groups match your filters"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {batchesPage.items.map((entry) => (
                <DispatchedGroupCard
                  key={entry.group.groupId}
                  entry={entry}
                  usersById={usersById}
                  formatters={formatters}
                  showAssignee
                />
              ))}
            </div>
            <AssignmentPagination
              page={batchesPage.page}
              pageCount={batchesPage.pageCount}
              pageSize={batchesPage.pageSize}
              totalItems={batchesPage.totalItems}
              startIndex={batchesPage.startIndex}
              endIndex={batchesPage.endIndex}
              onPageChange={batchesPage.setPage}
              onPageSizeChange={batchesPage.setPageSize}
              pageSizeOptions={[4, 6, 12]}
              variant="standalone"
              itemLabel={{ vi: "đợt điều phối", en: "dispatch batches" }}
              hideIfSinglePageAndSmall
            />
          </div>
        )
      ) : activeItems.length === 0 ? (
        <div
          className={`space-y-2 rounded-2xl p-10 text-center ${NM.recessed}`}
        >
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="text-sm font-bold text-foreground">
            {isVietnamese
              ? "Không có hồ sơ sự cố nào đang chờ ở bước này"
              : "No incidents waiting in this step"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isVietnamese
              ? "Bạn có thể đổi bộ lọc, chuyển sang bước tiếp theo hoặc mở Danh sách Sự cố để tra cứu lịch sử."
              : "Adjust your filters, switch steps above, or open the Incident List."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupsPage.items.map((grp) => (
            <AssignmentWorkGroupCard
              key={grp.key}
              group={grp}
              resetKey={resetKey}
              currentUserId={currentUserId}
              selectedIds={selectedIds}
              selectable
              allowManagerActions
              actionMode={managerTab}
              batchReviewPending={batchReviewPending}
              batchActionPending={batchActionPending}
              onToggleSelectOne={onToggleSelectOne}
              onToggleSelectMany={onToggleSelectMany}
              onBatchConfirmOnly={onBatchConfirmOnly}
              onBatchDispatch={onBatchDispatch}
              onBatchClose={onBatchClose}
              responsibilityContext={responsibilityContext}
              formatters={formatters}
              rowActions={rowActions}
            />
          ))}

          <AssignmentPagination
            page={groupsPage.page}
            pageCount={groupsPage.pageCount}
            pageSize={groupsPage.pageSize}
            totalItems={groupsPage.totalItems}
            startIndex={groupsPage.startIndex}
            endIndex={groupsPage.endIndex}
            onPageChange={groupsPage.setPage}
            onPageSizeChange={groupsPage.setPageSize}
            pageSizeOptions={[3, 5, 10, 20]}
            variant="standalone"
            itemLabel={{ vi: "nhóm công việc", en: "work groups" }}
            hideIfSinglePageAndSmall
          />
        </div>
      )}
    </div>
  );
}
