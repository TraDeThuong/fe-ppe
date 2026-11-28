"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { incidentService } from "@/services/incident.service";
import type { IncidentWorkGroup } from "@/lib/incident-assignment-groups";
import type { IncidentItem, IncidentQueryParams, IncidentStatus } from "@/types";

/** Bước (tab) của Quản lý hoặc Officer có nút "Tải thêm" theo nhóm. */
export type LoadMoreTab = "triage" | "dispatched" | "acceptance" | "pending" | "completed";

const PAGE_SIZE = 50;
/** Mỗi lần bấm quét tối đa chừng này trang để tìm hồ sơ chưa có trên màn hình. */
const MAX_PAGES_PER_CLICK = 5;

type QuerySpec = Pick<IncidentQueryParams, "status" | "hasActiveAssignment" | "assignedToMe" | "includeAllAssignments">;

/**
 * Trạng thái cần tải cho từng bước. `hasActiveAssignment` (hợp đồng mục 3) giúp BE trả đúng phần
 * "chưa giao / đã giao"; BE cũ bỏ qua tham số này nên FE vẫn tự phân loại theo `assignments`.
 */
function tabQuerySpecs(tab: LoadMoreTab): QuerySpec[] {
  switch (tab) {
    case "triage":
      return [
        { status: "PENDING_REVIEW" as IncidentStatus },
        { status: "CONFIRMED" as IncidentStatus, hasActiveAssignment: false },
      ];
    case "dispatched":
      return [{ status: "CONFIRMED" as IncidentStatus, hasActiveAssignment: true }];
    case "acceptance":
      return [{ status: "RESOLVED" as IncidentStatus, includeAllAssignments: true }];
    case "pending":
      return [{ status: "CONFIRMED" as IncidentStatus, assignedToMe: true }];
    case "completed":
      return [
        { status: "RESOLVED" as IncidentStatus, assignedToMe: true, includeAllAssignments: true },
        { status: "CLOSED" as IncidentStatus, assignedToMe: true, includeAllAssignments: true },
      ];
  }
}

/** Bộ lọc server khớp với cách gom nhóm; nhóm không có bộ lọc tương ứng thì tải tiếp cả bước. */
export function groupServerFilter(group: Pick<IncidentWorkGroup, "groupBy" | "items" | "officerMeta">): Partial<IncidentQueryParams> {
  const first = group.items[0];
  if (!first) return {};
  switch (group.groupBy) {
    case "camera":
      return first.cameraId ? { cameraId: first.cameraId } : {};
    case "violation":
      return first.violationType ? { violationType: first.violationType } : {};
    case "severity":
      return first.severity ? { severity: first.severity } : {};
    case "officer":
      return group.officerMeta?.officerId ? { assignedTo: group.officerMeta.officerId } : {};
    default:
      return {};
  }
}

function stateKey(tab: LoadMoreTab, filter: Partial<IncidentQueryParams>): string {
  return `${tab}|${JSON.stringify(filter)}`;
}

export interface GroupLoadState {
  loading: boolean;
  done: boolean;
}

/** Gộp hồ sơ tải thêm vào danh sách chính (bản trong danh sách chính mới hơn nên được giữ). */
export function mergeLoadedIncidents(primary: readonly IncidentItem[], extra: readonly IncidentItem[]): IncidentItem[] {
  if (extra.length === 0) return primary as IncidentItem[];
  const ids = new Set(primary.map((i) => i.id));
  const merged = [...primary, ...extra.filter((i) => !ids.has(i.id))];
  return merged.sort(
    (a, b) => (Date.parse(b.detectedAt || b.createdAt || "") || 0) - (Date.parse(a.detectedAt || a.createdAt || "") || 0),
  );
}

export function useGroupLoadMore(params: {
  siteId?: string;
  isOfficer: boolean;
  splitConfirmed: boolean;
}) {
  const { siteId, isOfficer } = params;
  const [extraIncidents, setExtraIncidents] = useState<IncidentItem[]>([]);
  const [states, setStates] = useState<Record<string, GroupLoadState & { page: number }>>({});
  const extraRef = useRef<IncidentItem[]>([]);
  extraRef.current = extraIncidents;

  // Đổi công trường / vai trò → bỏ phần đã tải thêm.
  useEffect(() => {
    setExtraIncidents([]);
    setStates({});
  }, [siteId, isOfficer]);

  const stateOf = useCallback(
    (tab: LoadMoreTab, group: Pick<IncidentWorkGroup, "groupBy" | "items" | "officerMeta">): GroupLoadState => {
      const s = states[stateKey(tab, groupServerFilter(group))];
      return { loading: Boolean(s?.loading), done: Boolean(s?.done) };
    },
    [states],
  );

  const loadMore = useCallback(
    async (
      tab: LoadMoreTab,
      group: Pick<IncidentWorkGroup, "groupBy" | "items" | "officerMeta">,
      knownIds: ReadonlySet<string>,
    ) => {
      const filter = groupServerFilter(group);
      const key = stateKey(tab, filter);
      const current = states[key];
      if (current?.loading || current?.done) return;
      setStates((prev) => ({ ...prev, [key]: { page: current?.page ?? 0, loading: true, done: false } }));

      const specs = tabQuerySpecs(tab);
      const known = new Set([...knownIds, ...extraRef.current.map((i) => i.id)]);
      const found: IncidentItem[] = [];
      let page = current?.page ?? 0;
      let done = false;
      try {
        for (let i = 0; i < MAX_PAGES_PER_CLICK && !done; i++) {
          page += 1;
          const results = await Promise.all(
            specs.map((spec) =>
              incidentService.getIncidents(
                {
                  ...spec,
                  ...filter,
                  siteId: siteId || undefined,
                  includeAssignments: true,
                  page,
                  limit: PAGE_SIZE,
                  sortBy: "detectedAt",
                  sortOrder: "desc",
                },
                { suppressToast: true },
              ),
            ),
          );
          done = results.every((r) => (r.items?.length ?? 0) < PAGE_SIZE);
          for (const r of results) {
            for (const item of r.items ?? []) {
              if (!known.has(item.id)) {
                known.add(item.id);
                found.push(item);
              }
            }
          }
          if (found.length > 0) break;
        }
        if (found.length) setExtraIncidents((prev) => [...prev, ...found]);
        setStates((prev) => ({ ...prev, [key]: { page, loading: false, done } }));
      } catch (error) {
        setStates((prev) => ({ ...prev, [key]: { page: current?.page ?? 0, loading: false, done: false } }));
        throw error;
      }
    },
    [states, siteId],
  );

  return { extraIncidents, loadMore, stateOf };
}
