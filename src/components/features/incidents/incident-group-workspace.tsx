"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useCan } from "@/hooks/use-can";
import { useIncidentGroup } from "@/hooks/incidents/use-incident-group";
import { decodeIncidentGroup, encodeIncidentGroup, incidentGroupHref } from "@/lib/incident-group";
import { useLocale } from "@/providers/locale-provider";
import { IncidentGroupPanel } from "./incident-group-panel";

type GroupWorkspaceValue = ReturnType<typeof useIncidentGroup> & {
  navigate: (id: string) => void;
  markDirty: (source: string, dirty: boolean) => void;
  confirmDiscard: (source?: string) => boolean;
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
  const group = useMemo(() => decodeIncidentGroup(encoded, groupId, id), [encoded, groupId, id]);
  const controller = useIncidentGroup(group, {
    userId: user?.id, officerName: user?.fullName || user?.email || undefined,
    enabled: status === "authenticated" && can("PPE_INCIDENT_READ"),
    canResolve: can("PPE_INCIDENT_UPDATE"), lastAlert,
  });
  const dirty = useRef(new Map<string, boolean>());
  const savedLocation = useRef<{ url: string; state: unknown } | null>(null);
  const markDirty = useCallback((source: string, value: boolean) => { dirty.current.set(source, value); }, []);
  const confirmDiscard = useCallback((source?: string) => {
    if (controller.busy) return false;
    const pending = source ? dirty.current.get(source) : [...dirty.current.values()].some(Boolean);
    if (pending && !window.confirm(vi ? "Báo cáo có nội dung chưa lưu. Bạn muốn bỏ thay đổi để rời đi?" : "This report has unsaved changes. Discard them and leave?")) return false;
    if (source) dirty.current.set(source, false);
    else dirty.current.clear();
    return true;
  }, [controller.busy, vi]);
  const navigate = useCallback((nextId: string) => {
    if (!group || nextId === id || !confirmDiscard()) return;
    router.replace(incidentGroupHref(group, nextId, params.get("focus") === "compare"), { scroll: false });
  }, [group, id, confirmDiscard, router, params]);

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
      if (confirmDiscard()) return;
      event.stopImmediatePropagation();
      if (savedLocation.current) window.history.pushState(savedLocation.current.state, "", savedLocation.current.url);
    };
    const link = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") as HTMLAnchorElement | null : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || anchor.href === window.location.href) return;
      if (!confirmDiscard()) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", pop, true);
    document.addEventListener("click", link, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", pop, true);
      document.removeEventListener("click", link, true);
    };
  }, [group, controller.busy, confirmDiscard]);

  return <GroupWorkspaceContext value={group ? { ...controller, navigate, markDirty, confirmDiscard } : null}>
    <div className="space-y-5">
      {group && <IncidentGroupPanel key={`${scope}:${id}`} group={group} currentId={id} userId={user?.id || ""} controller={controller}
        navigate={navigate} markDirty={markDirty} confirmDiscard={confirmDiscard} />}
      {!group && (encoded || groupId || params.get("dispatch") === "legacy") && <div role="status" className="rounded-xl border border-border/40 bg-surface p-4 text-xs text-muted-foreground">
        <p>{encoded || groupId ? (vi ? "Ngữ cảnh nhóm không hợp lệ. Đang mở hồ sơ đơn; không suy đoán thành viên nhóm." : "Invalid group context. Opening a single record without guessing group membership.")
          : (vi ? "Thông báo cũ không lưu danh sách sự cố trong nhóm. Bạn đang xem hồ sơ đại diện." : "This older notification does not include group members. You are viewing its representative record.")}</p>
        <Link className="mt-2 inline-block font-semibold text-primary underline" href="/incidents">{vi ? "Mở danh sách và lọc sự cố được giao" : "Open incidents and filter your assignments"}</Link>
      </div>}
      {children}
    </div>
  </GroupWorkspaceContext>;
}
