"use client";

import {
  Archive,
  Camera,
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
import { groupIncidentsByCamera } from "@/lib/incident-workflow";
import type { IncidentItem, SiteItem } from "@/types";
import {
  AssignmentPagination,
  PaginatedIncidentRows,
  useClientPagination,
} from "./assignment-pagination";
import type {
  AssignmentFormatters,
  AssignmentResponsibilityContext,
  AssignmentRowActions,
  CategorizedAssignments,
  ManagerTabKey,
} from "./types";

export interface ManagerDispatchWorkspaceProps {
  managerTab: ManagerTabKey;
  categorized: CategorizedAssignments;
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
}

export function ManagerDispatchWorkspace({
  managerTab,
  categorized,
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
}: ManagerDispatchWorkspaceProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const activeItems =
    managerTab === "triage"
      ? categorized.triageItems
      : managerTab === "dispatched"
        ? categorized.assignedConfirmed
        : categorized.awaitingAcceptance;

  const activeIds = activeItems.map((i) => i.id);
  const selectedInTab = activeItems.filter((i) => selectedIds.has(i.id));
  const pendingInSelected = selectedInTab
    .filter((i) => i.status === "PENDING_REVIEW")
    .map((i) => i.id);
  const allTabSelected =
    activeIds.length > 0 && activeIds.every((id) => selectedIds.has(id));

  const tabCameraGroups = groupIncidentsByCamera(
    activeItems,
    formatters.resolveCameraLabel,
  );

  const cameraGroupsPage = useClientPagination(tabCameraGroups, {
    defaultPageSize: 5,
    resetKey: `${managerTab}:${siteFilter}`,
  });

  return (
    <div className="space-y-5">
      {/* Thanh Thao tác Hàng loạt Luôn Hiển thị (Neumorphic Bulk Action Bar) */}
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

          {managerTab === "triage" && categorized.pendingReview.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                onToggleSelectMany(categorized.pendingReview.map((i) => i.id))
              }
              className="gap-1.5 text-xs text-warning"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>
                {isVietnamese
                  ? `Chọn riêng Chờ duyệt AI (${categorized.pendingReview.length})`
                  : `Select Pending Review (${categorized.pendingReview.length})`}
              </span>
            </Button>
          )}

          <select
            value={siteFilter}
            onChange={(e) => onSiteChange(e.target.value)}
            aria-label={isVietnamese ? "Lọc theo công trường" : "Filter by site"}
            className="w-full sm:w-auto max-w-full rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">
              {isVietnamese ? "Tất cả công trường" : "All Sites"}
            </option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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

      {/* Danh sách sự cố gom theo Cụm Camera */}
      {activeItems.length === 0 ? (
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
              ? "Bạn có thể chuyển sang bước tiếp theo trên thanh điều khiển hoặc mở Danh sách Sự cố để tra cứu lịch sử."
              : "Switch to another step tab above or open the Incident List to browse history."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cameraGroupsPage.items.map((grp) => {
            const allCamIds = grp.items.map((i) => i.id);
            const selectedInCam = allCamIds.filter((id) =>
              selectedIds.has(id),
            ).length;
            const isAllCamSelected =
              allCamIds.length > 0 && selectedInCam === allCamIds.length;
            const siteName = formatters.resolveSiteLabel(
              grp.items[0]?.siteId,
              grp.items[0]?.siteName,
            );

            return (
              <div
                key={grp.cameraKey}
                className={`overflow-hidden rounded-2xl ${NM.extruded}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 bg-muted/20 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isAllCamSelected}
                      onChange={() => onToggleSelectMany(allCamIds)}
                      className="h-4 w-4 cursor-pointer rounded accent-primary"
                      aria-label={`Select camera group ${grp.cameraLabel}`}
                    />
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
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {managerTab === "triage" && (
                      <>
                        {grp.pendingIds.length > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={batchReviewPending}
                            onClick={() => onBatchConfirmOnly(grp.pendingIds)}
                            className="h-7 gap-1 px-2.5 text-[11px]"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              {isVietnamese
                                ? `Xác nhận cụm (${grp.pendingIds.length})`
                                : `Confirm (${grp.pendingIds.length})`}
                            </span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={batchActionPending}
                          onClick={() => onBatchDispatch(grp.items)}
                          className="h-7 gap-1 px-2.5 text-[11px]"
                        >
                          <Send className="h-3 w-3" />
                          <span>
                            {isVietnamese
                              ? `Duyệt & Giao cả cụm (${grp.items.length})`
                              : `Dispatch Cluster (${grp.items.length})`}
                          </span>
                        </Button>
                      </>
                    )}

                    {managerTab === "acceptance" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={batchActionPending}
                        onClick={() => onBatchClose(grp.items)}
                        className="h-7 gap-1 bg-emerald-600 px-2.5 text-[11px] text-white hover:bg-emerald-700"
                      >
                        <Archive className="h-3 w-3" />
                        <span>
                          {isVietnamese
                            ? `Nghiệm thu & Đóng cụm (${grp.items.length})`
                            : `Close Cluster (${grp.items.length})`}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>

                <PaginatedIncidentRows
                  incidents={grp.items}
                  defaultPageSize={5}
                  pageSizeOptions={[5, 10, 20, 50]}
                  resetKey={`${managerTab}:${siteFilter}:${grp.cameraKey}`}
                  currentUserId={currentUserId}
                  selectedIds={selectedIds}
                  selectable
                  showResponsibility
                  allowManagerActions
                  onToggleSelect={onToggleSelectOne}
                  responsibilityContext={responsibilityContext}
                  formatters={formatters}
                  actions={rowActions}
                />
              </div>
            );
          })}

          <AssignmentPagination
            page={cameraGroupsPage.page}
            pageCount={cameraGroupsPage.pageCount}
            pageSize={cameraGroupsPage.pageSize}
            totalItems={cameraGroupsPage.totalItems}
            startIndex={cameraGroupsPage.startIndex}
            endIndex={cameraGroupsPage.endIndex}
            onPageChange={cameraGroupsPage.setPage}
            onPageSizeChange={cameraGroupsPage.setPageSize}
            pageSizeOptions={[3, 5, 10, 20]}
            variant="standalone"
            itemLabel={{ vi: "cụm camera", en: "camera clusters" }}
            hideIfSinglePageAndSmall
          />
        </div>
      )}
    </div>
  );
}
