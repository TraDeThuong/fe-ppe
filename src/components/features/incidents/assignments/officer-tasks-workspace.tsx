"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ListChecks,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import { incidentGroupHref } from "@/lib/incident-group";
import type { ResponsiblePersonRef } from "@/lib/incident-workflow";
import type { IncidentItem } from "@/types";
import { AssignmentIncidentRow } from "./assignment-incident-row";
import {
  AssignmentPagination,
  useClientPagination,
} from "./assignment-pagination";
import type {
  AssignmentFormatters,
  AssignmentResponsibilityContext,
  AssignmentRowActions,
  CategorizedAssignments,
  DispatchedGroupView,
  OfficerTabKey,
} from "./types";

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
}: OfficerTasksWorkspaceProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const activeItems =
    officerTab === "pending"
      ? categorized.myActiveConfirmed
      : categorized.myCompleted;
  const activeIds = activeItems.map((i) => i.id);
  const selectedMyItems = categorized.myActiveConfirmed.filter((i) =>
    selectedIds.has(i.id),
  );
  const allMyPendingSelected =
    categorized.myActiveConfirmed.length > 0 &&
    categorized.myActiveConfirmed.every((i) => selectedIds.has(i.id));

  const groupsPage = useClientPagination(dispatchedGroups, {
    defaultPageSize: 4,
    resetKey: "officer-groups",
  });

  const incidentsPage = useClientPagination(activeItems, {
    defaultPageSize: 10,
    resetKey: officerTab,
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
            {groupsPage.items.map(
              ({
                group,
                message,
                resolvedCount,
                remainingEditableItems,
              }) => {
                const total = group.incidentIds.length;
                const pct =
                  total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
                const managerName =
                  usersById.get(group.assignedBy)?.name ||
                  (isVietnamese ? "Quản lý An toàn" : "Safety Manager");

                return (
                  <div
                    key={group.groupId}
                    className={`space-y-3 rounded-2xl border border-primary/25 p-4 ${NM.extruded}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="info"
                            size="sm"
                            className="font-mono text-[10px]"
                          >
                            #{group.groupId.slice(0, 8)}
                          </Badge>
                          <span className="text-xs font-extrabold text-foreground">
                            {total}{" "}
                            {isVietnamese
                              ? "sự cố trong nhóm"
                              : "incidents in group"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {isVietnamese ? "Giao bởi: " : "Assigned by: "}
                          <strong className="text-foreground">
                            {managerName}
                          </strong>{" "}
                          • {new Date(group.createdAt).toLocaleString(locale)}
                        </p>
                      </div>

                      <span className="rounded-xl bg-primary/10 px-2.5 py-1 font-mono text-xs font-extrabold text-primary">
                        {resolvedCount}/{total} ({pct}%)
                      </span>
                    </div>

                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {message}
                    </p>

                    <div
                      className={`h-2 overflow-hidden rounded-full ${NM.recessed}`}
                    >
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {remainingEditableItems.length > 0 && (
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
              },
            )}
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

      {/* Khối 2: Danh sách Sự cố được giao cho tôi */}
      <section className="space-y-3">
        {officerTab === "pending" &&
          categorized.myActiveConfirmed.length > 0 && (
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 ${NM.extruded}`}
            >
              <span className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? `Thao tác nhanh trên ${categorized.myActiveConfirmed.length} sự cố cần khắc phục`
                  : `Quick actions for ${categorized.myActiveConfirmed.length} pending incidents`}
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
                        ? `Chọn tất cả việc của tôi (${categorized.myActiveConfirmed.length})`
                        : `Select all my tasks (${categorized.myActiveConfirmed.length})`}
                  </span>
                </Button>

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
        ) : (
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
        )}
      </section>
    </div>
  );
}
