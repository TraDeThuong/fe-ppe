"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useCan } from "@/hooks/use-can";
import { useIncidentGroup } from "@/hooks/incidents/use-incident-group";
import { decodeIncidentGroup, encodeIncidentGroup, incidentGroupHref, rememberIncidentGroup } from "@/lib/incident-group";
import { groupFromBatchItems } from "@/lib/incident-dispatch-batches";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { incidentService } from "@/services/incident.service";
import { useLocale } from "@/providers/locale-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IncidentGroupPanel } from "./incident-group-panel";

type GroupWorkspaceValue = ReturnType<typeof useIncidentGroup> & {
  navigate: (id: string) => void;
  markDirty: (source: string, dirty: boolean) => void;
  /**
   * true → không có thay đổi chưa lưu, nơi gọi tiếp tục ngay. false → đang bận hoặc đã mở hộp xác nhận;
   * nếu người dùng chọn bỏ thay đổi thì `onProceed` được gọi.
   */
  confirmDiscard: (source?: string, onProceed?: () => void) => boolean;
};
const GroupWorkspaceContext = createContext<GroupWorkspaceValue | null>(null);
export const useIncidentGroupWorkspace = () => useContext(GroupWorkspaceContext);

export function IncidentGroupWorkspace({ id, children }: { id: string; children: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, status } = useAuth();
  const { lastAlert } = useRealtime();
  const { locale } = useLocale();
  const vi = locale === "vi-VN";
  const can = useCan();
  const encoded = params.get("context");
  const groupId = params.get("group");
  const localGroup = useMemo(() => decodeIncidentGroup(encoded, groupId, id), [encoded, groupId, id]);
  // Sổ nhóm cục bộ không có (mở link trên máy khác) → hỏi BE theo batchId (hợp đồng mục 4).
  const canReadIncidents = status === "authenticated" && can("PPE_INCIDENT_READ");
  const remoteBatch = useQuery({
    queryKey: [...incidentKeys.all, "dispatch-batch", groupId] as const,
    queryFn: async ({ signal }) => {
      const res = await incidentService.getIncidents(
        { batchId: groupId!, includeAssignments: true, includeAllAssignments: true, page: 1, limit: 100, sortBy: "detectedAt", sortOrder: "asc" },
        { signal, suppressToast: true },
      );
      return groupFromBatchItems(groupId!, res.items);
    },
    enabled: canReadIncidents && !localGroup && !encoded && Boolean(groupId),
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const group = useMemo(() => {
    if (localGroup) return localGroup;
    const remote = remoteBatch.data;
    return remote && remote.incidentIds.includes(id) ? remote : null;
  }, [localGroup, remoteBatch.data, id]);
  useEffect(() => {
    if (group && !localGroup) rememberIncidentGroup(group);
  }, [group, localGroup]);
  const controller = useIncidentGroup(group, {
    userId: user?.id, officerName: user?.fullName || user?.email || undefined,
    enabled: status === "authenticated" && can("PPE_INCIDENT_READ"),
    canResolve: can("PPE_INCIDENT_UPDATE"), lastAlert,
  });
  const dirty = useRef(new Map<string, boolean>());
  const savedLocation = useRef<{ url: string; state: unknown } | null>(null);
  const markDirty = useCallback((source: string, value: boolean) => { dirty.current.set(source, value); }, []);
  const clearDirty = useCallback((source?: string) => {
    if (source) dirty.current.set(source, false);
    else dirty.current.clear();
  }, []);
  // Hộp xác nhận của design system thay cho window.confirm; giữ lại thao tác cần chạy khi đồng ý bỏ thay đổi.
  const [pendingDiscard, setPendingDiscard] = useState<{ source?: string; proceed?: () => void } | null>(null);
  const confirmDiscard = useCallback((source?: string, onProceed?: () => void) => {
    if (controller.busy) return false;
    const pending = source ? dirty.current.get(source) : [...dirty.current.values()].some(Boolean);
    if (pending) {
      setPendingDiscard({ source, proceed: onProceed });
      return false;
    }
    clearDirty(source);
    return true;
  }, [controller.busy, clearDirty]);
  const goTo = useCallback((nextId: string) => {
    if (!group) return;
    router.replace(incidentGroupHref(group, nextId, params.get("focus") === "compare"), { scroll: false });
  }, [group, router, params]);
  const navigate = useCallback((nextId: string) => {
    if (!group || nextId === id || !confirmDiscard(undefined, () => goTo(nextId))) return;
    goTo(nextId);
  }, [group, id, confirmDiscard, goTo]);

  const scope = group ? `${user?.id}:${encodeIncidentGroup(group)}` : "none";
  useEffect(() => { dirty.current.clear(); }, [scope, id]);
  const queryString = params.toString();
  useEffect(() => { savedLocation.current = { url: window.location.href, state: window.history.state }; }, [id, queryString]);
  useEffect(() => {
    if (!group) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (controller.busy || [...dirty.current.values()].some(Boolean)) {
        event.preventDefault(); event.returnValue = "";
      }
    };
    const pop = (event: PopStateEvent) => {
      // Đồng ý bỏ thay đổi → quay lại đúng trang người dùng vừa chọn bằng history.back().
      if (confirmDiscard(undefined, () => window.history.back())) return;
      event.stopImmediatePropagation();
      if (savedLocation.current) window.history.pushState(savedLocation.current.state, "", savedLocation.current.url);
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", pop, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", pop, true);
    };
  }, [group, controller.busy, confirmDiscard]);

  // Chỉ chặn link nằm trong vùng làm việc của nhóm (không bắt click trên toàn document).
  const guardGroupLinks = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!group) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") as HTMLAnchorElement | null : null;
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || event.button !== 0 ||
      event.ctrlKey || event.metaKey || event.shiftKey || anchor.href === window.location.href) return;
    const href = anchor.href;
    const proceed = () => {
      const url = new URL(href, window.location.href);
      if (url.origin === window.location.origin) router.push(`${url.pathname}${url.search}${url.hash}`);
      else window.location.assign(href);
    };
    if (!confirmDiscard(undefined, proceed)) { event.preventDefault(); event.stopPropagation(); }
  }, [group, confirmDiscard, router]);

  return <GroupWorkspaceContext value={group ? { ...controller, navigate, markDirty, confirmDiscard } : null}>
    <div className="space-y-5" onClickCapture={guardGroupLinks}>
      {group && <IncidentGroupPanel key={`${scope}:${id}`} group={group} currentId={id} userId={user?.id || ""} controller={controller}
        navigate={navigate} markDirty={markDirty} confirmDiscard={confirmDiscard} />}
      {!group && !remoteBatch.isLoading && (encoded || groupId || params.get("dispatch") === "legacy") && <div role="status" className="rounded-xl border border-border/40 bg-surface p-4 text-xs text-muted-foreground">
        <p>{encoded || groupId ? (vi ? "Ngữ cảnh nhóm không hợp lệ. Đang mở hồ sơ đơn; không suy đoán thành viên nhóm." : "Invalid group context. Opening a single record without guessing group membership.")
          : (vi ? "Thông báo cũ không lưu danh sách sự cố trong nhóm. Bạn đang xem hồ sơ đại diện." : "This older notification does not include group members. You are viewing its representative record.")}</p>
        <Link className="mt-2 inline-block font-semibold text-primary underline" href="/incidents">{vi ? "Mở danh sách và lọc sự cố được giao" : "Open incidents and filter your assignments"}</Link>
      </div>}
      {children}
    </div>
    <ConfirmDialog
      open={Boolean(pendingDiscard)}
      onClose={() => setPendingDiscard(null)}
      onConfirm={() => {
        const next = pendingDiscard;
        setPendingDiscard(null);
        clearDirty(next?.source);
        next?.proceed?.();
      }}
      variant="warning"
      title={vi ? "Bỏ nội dung báo cáo chưa lưu?" : "Discard unsaved report?"}
      description={vi ? "Báo cáo có nội dung chưa lưu. Bạn muốn bỏ thay đổi để rời đi?" : "This report has unsaved changes. Discard them and leave?"}
      confirmText={vi ? "Bỏ thay đổi" : "Discard"}
      cancelText={vi ? "Ở lại" : "Stay"}
    />
  </GroupWorkspaceContext>;
}
