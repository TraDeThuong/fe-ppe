"use client";

// Admin Oversight Workspace with per-group & group-level pagination
import {
  Archive,
  Building2,
  Camera,
  ChevronDown,
  ChevronRight,
  Send,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import type {
  CameraIncidentGroup,
  ManagerResponsibilityGroup,
  OfficerResponsibilityGroup,
  SiteResponsibilityGroup,
} from "@/lib/incident-workflow";
import type { IncidentItem, SiteItem } from "@/types";
import {
  AssignmentPagination,
  PaginatedIncidentRows,
  useClientPagination,
} from "./assignment-pagination";
import type {
  AdminGroupMode,
  AssignmentFormatters,
  AssignmentResponsibilityContext,
  AssignmentRowActions,
} from "./types";

export interface AdminOversightWorkspaceProps {
  adminGroupMode: AdminGroupMode;
  siteFilter: string;
  onSiteChange: (siteId: string) => void;
  sites: SiteItem[];
  expandedKeys: Record<string, boolean>;
  onToggleExpand: (key: string) => void;
  managerGroups: ManagerResponsibilityGroup[];
  officerGroups: OfficerResponsibilityGroup[];
  siteGroups: SiteResponsibilityGroup[];
  cameraGroups: CameraIncidentGroup[];
  currentUserId?: string;
  responsibilityContext: AssignmentResponsibilityContext;
  formatters: AssignmentFormatters;
  rowActions: AssignmentRowActions;
  onBatchDispatch: (items: IncidentItem[]) => void;
  onBatchClose: (items: IncidentItem[]) => void;
}

export function AdminOversightWorkspace({
  adminGroupMode,
  siteFilter,
  onSiteChange,
  sites,
  expandedKeys,
  onToggleExpand,
  managerGroups,
  officerGroups,
  siteGroups,
  cameraGroups,
  currentUserId,
  responsibilityContext,
  formatters,
  rowActions,
  onBatchDispatch,
  onBatchClose,
}: AdminOversightWorkspaceProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const resetKey = `${adminGroupMode}:${siteFilter}`;
  const managerGroupsPage = useClientPagination(managerGroups, {
    defaultPageSize: 5,
    resetKey,
  });
  const officerGroupsPage = useClientPagination(officerGroups, {
    defaultPageSize: 5,
    resetKey,
  });
  const siteGroupsPage = useClientPagination(siteGroups, {
    defaultPageSize: 5,
    resetKey,
  });
  const cameraGroupsPage = useClientPagination(cameraGroups, {
    defaultPageSize: 5,
    resetKey,
  });

  return (
    <div className="space-y-6">
      {/* Thanh Bộ lọc phạm vi Công trường (Neumorphic Toolbar) */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 ${NM.extruded}`}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          {adminGroupMode === "responsibility" && (
            <>
              <Users className="h-4 w-4 text-primary" />
              <span>
                {isVietnamese
                  ? `Phân rã theo Nhân sự chịu trách nhiệm (${managerGroups.length} Manager • ${officerGroups.length} Officer)`
                  : `Grouped by Responsible Personnel (${managerGroups.length} Managers • ${officerGroups.length} Officers)`}
              </span>
            </>
          )}
          {adminGroupMode === "site" && (
            <>
              <Building2 className="h-4 w-4 text-primary" />
              <span>
                {isVietnamese
                  ? `Phân rã theo Công trường (${siteGroups.length} công trường)`
                  : `Grouped by Site (${siteGroups.length} sites)`}
              </span>
            </>
          )}
          {adminGroupMode === "camera" && (
            <>
              <Camera className="h-4 w-4 text-primary" />
              <span>
                {isVietnamese
                  ? `Phân rã theo Cụm Camera (${cameraGroups.length} cụm camera)`
                  : `Grouped by Camera Cluster (${cameraGroups.length} clusters)`}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={siteFilter}
            onChange={(e) => onSiteChange(e.target.value)}
            className="rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
            aria-label={isVietnamese ? "Lọc theo công trường" : "Filter by site"}
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
      </div>

      {/* CHẾ ĐỘ 1: GOM THEO NHÂN SỰ & TRÁCH NHIỆM GIẢI QUYẾT */}
      {adminGroupMode === "responsibility" && (
        <div className="space-y-6">
          {/* Khối A: Trách nhiệm cấp Quản lý (Safety Managers) */}
          <section className="space-y-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                <ShieldAlert className="h-4 w-4 text-warning" />
                <span>
                  {isVietnamese
                    ? "A. Trách nhiệm cấp Quản lý An toàn (Safety Managers — Duyệt, Phân công & Nghiệm thu)"
                    : "A. Safety Manager Accountability (Review, Dispatch & Acceptance)"}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {isVietnamese
                  ? "Hiển thị những Safety Manager nào đang có sự cố chờ thẩm duyệt, đã duyệt nhưng chưa giao Officer, hoặc chờ nghiệm thu đóng hồ sơ."
                  : "Shows which Safety Managers have incidents awaiting review, unassigned to officers, or awaiting final acceptance."}
              </p>
            </div>

            {managerGroups.length === 0 ? (
              <div
                className={`rounded-2xl p-6 text-center text-xs text-muted-foreground ${NM.recessed}`}
              >
                {isVietnamese
                  ? "Không có sự cố nào đang tồn đọng ở khâu của Safety Manager."
                  : "No incidents are currently waiting on Safety Managers."}
              </div>
            ) : (
              <div className="space-y-3">
                {managerGroupsPage.items.map((mGrp) => {
                  const expandKey = `mgr_${mGrp.managerKey}`;
                  const isExpanded = Boolean(expandedKeys[expandKey]);
                  const dispatchable = [
                    ...mGrp.pendingReviewItems,
                    ...mGrp.unassignedConfirmedItems,
                  ];

                  return (
                    <div
                      key={mGrp.managerKey}
                      className={`overflow-hidden rounded-2xl ${NM.extruded}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 bg-muted/20 px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => onToggleExpand(expandKey)}
                          className="flex min-w-0 items-center gap-3 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 font-bold text-amber-600 dark:text-amber-400">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-extrabold text-foreground">
                                {mGrp.managerName}
                              </span>
                              <Badge
                                variant="outline"
                                size="sm"
                                className="text-[10px]"
                              >
                                SAFETY_MANAGER
                              </Badge>
                              {mGrp.managerEmail && (
                                <span className="text-xs text-muted-foreground">
                                  ({mGrp.managerEmail})
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {isVietnamese
                                ? "Công trường phụ trách: "
                                : "Managed sites: "}
                              <strong className="text-foreground">
                                {mGrp.siteNames.join(", ") || "—"}
                              </strong>
                            </p>
                          </div>
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          {mGrp.pendingReviewItems.length > 0 && (
                            <span className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                              {mGrp.pendingReviewItems.length}{" "}
                              {isVietnamese ? "chờ duyệt AI" : "pending review"}
                            </span>
                          )}
                          {mGrp.unassignedConfirmedItems.length > 0 && (
                            <span className="rounded-lg border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                              {mGrp.unassignedConfirmedItems.length}{" "}
                              {isVietnamese ? "chưa giao Officer" : "unassigned"}
                            </span>
                          )}
                          {mGrp.awaitingAcceptanceItems.length > 0 && (
                            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              {mGrp.awaitingAcceptanceItems.length}{" "}
                              {isVietnamese
                                ? "chờ nghiệm thu đóng"
                                : "awaiting closure"}
                            </span>
                          )}

                          {dispatchable.length > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={() => onBatchDispatch(dispatchable)}
                              className="h-7 gap-1 px-2.5 text-[11px]"
                            >
                              <Send className="h-3 w-3" />
                              <span>
                                {isVietnamese
                                  ? `Duyệt & Giao thay (${dispatchable.length})`
                                  : `Dispatch All (${dispatchable.length})`}
                              </span>
                            </Button>
                          )}

                          {mGrp.awaitingAcceptanceItems.length > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onBatchClose(mGrp.awaitingAcceptanceItems)
                              }
                              className="h-7 gap-1 px-2.5 text-[11px]"
                            >
                              <Archive className="h-3 w-3" />
                              <span>
                                {isVietnamese
                                  ? `Đóng thay (${mGrp.awaitingAcceptanceItems.length})`
                                  : `Close All (${mGrp.awaitingAcceptanceItems.length})`}
                              </span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <PaginatedIncidentRows
                          incidents={mGrp.allActionableItems}
                          defaultPageSize={5}
                          pageSizeOptions={[5, 10, 20, 50]}
                          resetKey={`${expandKey}:${siteFilter}`}
                          currentUserId={currentUserId}
                          showResponsibility
                          allowManagerActions
                          responsibilityContext={responsibilityContext}
                          formatters={formatters}
                          actions={rowActions}
                        />
                      )}
                    </div>
                  );
                })}

                <AssignmentPagination
                  page={managerGroupsPage.page}
                  pageCount={managerGroupsPage.pageCount}
                  pageSize={managerGroupsPage.pageSize}
                  totalItems={managerGroupsPage.totalItems}
                  startIndex={managerGroupsPage.startIndex}
                  endIndex={managerGroupsPage.endIndex}
                  onPageChange={managerGroupsPage.setPage}
                  onPageSizeChange={managerGroupsPage.setPageSize}
                  pageSizeOptions={[5, 10, 20]}
                  variant="standalone"
                  itemLabel={{ vi: "nhóm Manager", en: "Manager groups" }}
                  hideIfSinglePageAndSmall
                />
              </div>
            )}
          </section>

          {/* Khối B: Trách nhiệm cấp Cán bộ Hiện trường (Safety Officers) */}
          <section className="space-y-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                <UserCheck className="h-4 w-4 text-primary" />
                <span>
                  {isVietnamese
                    ? "B. Trách nhiệm cấp Cán bộ Hiện trường (Safety Officers — Đang nhận việc & Khắc phục)"
                    : "B. Field Safety Officer Accountability (Assigned & Remediating)"}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {isVietnamese
                  ? "Tổng hợp theo từng Safety Officer: ai đang giữ bao nhiêu sự cố hiện trường, tiến độ khắc phục và danh sách hồ sơ cụ thể."
                  : "Grouped by each Safety Officer: active field workload, remediation progress, and assigned records."}
              </p>
            </div>

            {officerGroups.length === 0 ? (
              <div
                className={`rounded-2xl p-6 text-center text-xs text-muted-foreground ${NM.recessed}`}
              >
                {isVietnamese
                  ? "Hiện chưa có sự cố nào được phân công cho Safety Officer."
                  : "No incidents have been assigned to Safety Officers yet."}
              </div>
            ) : (
              <div className="space-y-3">
                {officerGroupsPage.items.map((oGrp) => {
                  const expandKey = `off_${oGrp.officerId}`;
                  const isExpanded = Boolean(expandedKeys[expandKey]);
                  const allOfficerItems = [
                    ...oGrp.activeConfirmedItems,
                    ...oGrp.resolvedItems,
                    ...oGrp.closedItems,
                  ];

                  return (
                    <div
                      key={oGrp.officerId}
                      className={`overflow-hidden rounded-2xl ${NM.extruded}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 bg-muted/20 px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => onToggleExpand(expandKey)}
                          className="flex min-w-0 items-center gap-3 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-bold text-primary">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-extrabold text-foreground">
                                {oGrp.officerName}
                              </span>
                              <Badge
                                variant="info"
                                size="sm"
                                className="text-[10px]"
                              >
                                SAFETY_OFFICER
                              </Badge>
                              {oGrp.officerEmail && (
                                <span className="text-xs text-muted-foreground">
                                  ({oGrp.officerEmail})
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {oGrp.siteNames.join(", ")} • Camera:{" "}
                              <span className="font-mono text-foreground">
                                {oGrp.cameraLabels.slice(0, 4).join(", ")}
                              </span>
                            </p>
                          </div>
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                            {oGrp.activeConfirmedItems.length}{" "}
                            {isVietnamese ? "đang xử lý" : "in progress"}
                          </span>
                          <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            {oGrp.resolvedItems.length}{" "}
                            {isVietnamese
                              ? "đã khắc phục (chờ đóng)"
                              : "resolved"}
                          </span>
                          <span className="rounded-lg border border-border/50 bg-background px-2.5 py-1 font-mono text-[11px] font-extrabold text-foreground">
                            {isVietnamese ? "Hoàn thành:" : "Done:"}{" "}
                            {oGrp.completionRate}%
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <PaginatedIncidentRows
                          incidents={allOfficerItems}
                          defaultPageSize={5}
                          pageSizeOptions={[5, 10, 20, 50]}
                          resetKey={`${expandKey}:${siteFilter}`}
                          currentUserId={currentUserId}
                          showResponsibility
                          allowManagerActions
                          responsibilityContext={responsibilityContext}
                          formatters={formatters}
                          actions={rowActions}
                        />
                      )}
                    </div>
                  );
                })}

                <AssignmentPagination
                  page={officerGroupsPage.page}
                  pageCount={officerGroupsPage.pageCount}
                  pageSize={officerGroupsPage.pageSize}
                  totalItems={officerGroupsPage.totalItems}
                  startIndex={officerGroupsPage.startIndex}
                  endIndex={officerGroupsPage.endIndex}
                  onPageChange={officerGroupsPage.setPage}
                  onPageSizeChange={officerGroupsPage.setPageSize}
                  pageSizeOptions={[5, 10, 20]}
                  variant="standalone"
                  itemLabel={{ vi: "nhóm Officer", en: "Officer groups" }}
                  hideIfSinglePageAndSmall
                />
              </div>
            )}
          </section>
        </div>
      )}

      {/* CHẾ ĐỘ 2: GOM THEO NHÓM CÔNG TRƯỜNG (SITE & ĐỘI PHỤ TRÁCH) */}
      {adminGroupMode === "site" && (
        <div className="space-y-3">
          {siteGroupsPage.items.map((sGrp) => {
            const expandKey = `site_${sGrp.siteId}`;
            const isExpanded = expandedKeys[expandKey] ?? true;
            const dispatchable = [
              ...sGrp.pendingItems,
              ...sGrp.unassignedConfirmedItems,
            ];

            return (
              <div
                key={sGrp.siteId || "unknown"}
                className={`overflow-hidden rounded-2xl ${NM.extruded}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 bg-muted/20 px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => onToggleExpand(expandKey)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Building2 className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-foreground">
                        {sGrp.siteName} ({sGrp.items.length}{" "}
                        {isVietnamese ? "sự cố" : "incidents"})
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>
                          {isVietnamese
                            ? "Manager chịu trách nhiệm: "
                            : "Responsible Manager: "}
                          <strong className="text-foreground">
                            {sGrp.managerNames.join(", ") ||
                              (isVietnamese ? "Chưa gán Manager" : "Unassigned")}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          {isVietnamese
                            ? "Officer đang xử lý: "
                            : "Active Officers: "}
                          <strong className="text-primary">
                            {sGrp.officerNames.join(", ") ||
                              (isVietnamese
                                ? "Chưa có Officer nhận việc"
                                : "None")}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {sGrp.pendingItems.length > 0 && (
                      <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                        {sGrp.pendingItems.length}{" "}
                        {isVietnamese ? "chờ duyệt" : "pending"}
                      </span>
                    )}
                    {sGrp.unassignedConfirmedItems.length > 0 && (
                      <span className="rounded-lg bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                        {sGrp.unassignedConfirmedItems.length}{" "}
                        {isVietnamese ? "chưa giao" : "unassigned"}
                      </span>
                    )}
                    {sGrp.assignedConfirmedItems.length > 0 && (
                      <span className="rounded-lg bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-600">
                        {sGrp.assignedConfirmedItems.length}{" "}
                        {isVietnamese ? "Officer đang xử lý" : "in progress"}
                      </span>
                    )}
                    {sGrp.resolvedItems.length > 0 && (
                      <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                        {sGrp.resolvedItems.length}{" "}
                        {isVietnamese ? "chờ nghiệm thu" : "resolved"}
                      </span>
                    )}
                    {dispatchable.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => onBatchDispatch(dispatchable)}
                        className="h-7 gap-1 px-2.5 text-[11px]"
                      >
                        <Send className="h-3 w-3" />
                        <span>
                          {isVietnamese
                            ? `Giao cả công trường (${dispatchable.length})`
                            : `Dispatch Site (${dispatchable.length})`}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <PaginatedIncidentRows
                    incidents={sGrp.items}
                    defaultPageSize={5}
                    pageSizeOptions={[5, 10, 20, 50]}
                    resetKey={`${expandKey}:${siteFilter}`}
                    currentUserId={currentUserId}
                    showResponsibility
                    allowManagerActions
                    responsibilityContext={responsibilityContext}
                    formatters={formatters}
                    actions={rowActions}
                  />
                )}
              </div>
            );
          })}

          <AssignmentPagination
            page={siteGroupsPage.page}
            pageCount={siteGroupsPage.pageCount}
            pageSize={siteGroupsPage.pageSize}
            totalItems={siteGroupsPage.totalItems}
            startIndex={siteGroupsPage.startIndex}
            endIndex={siteGroupsPage.endIndex}
            onPageChange={siteGroupsPage.setPage}
            onPageSizeChange={siteGroupsPage.setPageSize}
            pageSizeOptions={[5, 10, 20]}
            variant="standalone"
            itemLabel={{ vi: "công trường", en: "sites" }}
            hideIfSinglePageAndSmall
          />
        </div>
      )}

      {/* CHẾ ĐỘ 3: GOM THEO CỤM CAMERA */}
      {adminGroupMode === "camera" && (
        <div className="space-y-3">
          {cameraGroupsPage.items.map((cGrp) => {
            const expandKey = `cam_${cGrp.cameraKey}`;
            const isExpanded = expandedKeys[expandKey] ?? true;
            const dispatchable = cGrp.items.filter(
              (i) => i.status === "PENDING_REVIEW" || i.status === "CONFIRMED",
            );

            return (
              <div
                key={cGrp.cameraKey}
                className={`overflow-hidden rounded-2xl ${NM.extruded}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 bg-muted/20 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleExpand(expandKey)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Camera className="h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <div className="text-sm font-bold text-foreground">
                        {cGrp.cameraLabel}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatters.resolveSiteLabel(
                          cGrp.items[0]?.siteId,
                          cGrp.items[0]?.siteName,
                        )}{" "}
                        • {cGrp.items.length}{" "}
                        {isVietnamese ? "sự cố" : "incidents"}
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {cGrp.pendingIds.length > 0 && (
                      <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                        {cGrp.pendingIds.length}{" "}
                        {isVietnamese ? "chờ duyệt" : "pending"}
                      </span>
                    )}
                    {cGrp.confirmedIds.length > 0 && (
                      <span className="rounded-lg bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-600">
                        {cGrp.confirmedIds.length}{" "}
                        {isVietnamese ? "đã xác nhận" : "confirmed"}
                      </span>
                    )}
                    {cGrp.resolvedIds.length > 0 && (
                      <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                        {cGrp.resolvedIds.length}{" "}
                        {isVietnamese ? "chờ đóng" : "resolved"}
                      </span>
                    )}
                    {dispatchable.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => onBatchDispatch(dispatchable)}
                        className="h-7 gap-1 px-2.5 text-[11px]"
                      >
                        <Send className="h-3 w-3" />
                        <span>
                          {isVietnamese
                            ? `Giao cả cụm (${dispatchable.length})`
                            : `Dispatch Group (${dispatchable.length})`}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <PaginatedIncidentRows
                    incidents={cGrp.items}
                    defaultPageSize={5}
                    pageSizeOptions={[5, 10, 20, 50]}
                    resetKey={`${expandKey}:${siteFilter}`}
                    currentUserId={currentUserId}
                    showResponsibility
                    allowManagerActions
                    responsibilityContext={responsibilityContext}
                    formatters={formatters}
                    actions={rowActions}
                  />
                )}
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
            pageSizeOptions={[5, 10, 20]}
            variant="standalone"
            itemLabel={{ vi: "cụm camera", en: "camera clusters" }}
            hideIfSinglePageAndSmall
          />
        </div>
      )}
    </div>
  );
}
