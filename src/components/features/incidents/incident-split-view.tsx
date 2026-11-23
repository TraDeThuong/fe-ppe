"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IncidentCardList } from "./incident-card-list";
import { IncidentQuickDetailPanel } from "./incident-quick-detail-panel";
import type { IncidentItem } from "@/types";

export interface IncidentSplitViewProps {
  incidents: IncidentItem[];
  highlightedId?: string | null;
  canSelectRows?: boolean;
  selectedIdSet?: Set<string>;
  onToggleRowSelection?: (id: string) => void;
  loading?: boolean;
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onReview?: (incident: IncidentItem) => void;
  onAssign?: (incident: IncidentItem) => void;
  onResolve?: (incident: IncidentItem) => void;
  onClose?: (incident: IncidentItem) => void;
  onEdit?: (incident: IncidentItem) => void;
  onDelete?: (incident: IncidentItem) => void;
}

export function IncidentSplitView({
  incidents,
  highlightedId,
  canSelectRows = false,
  selectedIdSet,
  onToggleRowSelection,
  loading = false,
  fetching = false,
  error,
  onRetry,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  onReview,
  onAssign,
  onResolve,
  onClose,
  onEdit,
  onDelete,
}: IncidentSplitViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => incidents[0]?.id ?? null,
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const lastIndexRef = useRef<number>(0);

  // Maintain valid selection when incidents change (filtering, paging, or after an action removes current item)
  useEffect(() => {
    if (incidents.length === 0) {
      setSelectedId(null);
      setMobileDrawerOpen(false);
      lastIndexRef.current = 0;
      return;
    }

    const existingIdx = selectedId
      ? incidents.findIndex((item) => item.id === selectedId)
      : -1;

    if (existingIdx >= 0) {
      lastIndexRef.current = existingIdx;
      return;
    }

    const nextIdx = Math.min(lastIndexRef.current, incidents.length - 1);
    lastIndexRef.current = nextIdx;
    setSelectedId(incidents[nextIdx]?.id ?? null);
  }, [incidents, selectedId]);

  const selectedIncident = useMemo(
    () =>
      incidents.find((item) => item.id === selectedId) ??
      incidents[0] ??
      null,
    [incidents, selectedId],
  );

  // Keyboard navigation (ArrowUp / ArrowDown) for rapid triage on desktop
  useEffect(() => {
    if (incidents.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest('[role="dialog"]'))
      ) {
        return;
      }

      e.preventDefault();
      const currentIdx = incidents.findIndex((i) => i.id === selectedIncident?.id);
      const safeCurrent = currentIdx >= 0 ? currentIdx : 0;
      const nextIdx =
        e.key === "ArrowDown"
          ? Math.min(incidents.length - 1, safeCurrent + 1)
          : Math.max(0, safeCurrent - 1);

      if (nextIdx !== safeCurrent && incidents[nextIdx]) {
        lastIndexRef.current = nextIdx;
        setSelectedId(incidents[nextIdx].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [incidents, selectedIncident?.id]);

  const handleSelectCard = (item: IncidentItem) => {
    const idx = incidents.findIndex((i) => i.id === item.id);
    if (idx >= 0) lastIndexRef.current = idx;
    setSelectedId(item.id);
    // On mobile/tablet (< xl), open detail drawer/modal
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setMobileDrawerOpen(true);
    }
  };

  return (
    <>
      {/* Unified Neumorphic Master-Detail Shell: Tự động chuyển đổi ánh sáng chuẩn cho cả Light & Dark Mode */}
      <div className="mx-auto flex max-w-[1600px] flex-col rounded-[32px] border border-black/[0.04] p-3 shadow-[14px_14px_30px_rgba(0,0,0,0.07),-14px_-14px_30px_rgba(255,255,255,0.8)] sm:p-4 xl:h-[calc(100dvh-2.5rem)] xl:overflow-hidden xl:p-5 dark:border-white/[0.06] dark:shadow-[14px_14px_32px_rgba(0,0,0,0.5),-10px_-10px_24px_rgba(255,255,255,0.03)] [&_*::-webkit-scrollbar]:w-1.5 [&_*::-webkit-scrollbar-thumb]:rounded-full [&_*::-webkit-scrollbar-thumb]:bg-current/15 [&_*::-webkit-scrollbar-track]:my-2 [&_*::-webkit-scrollbar-track]:rounded-full">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-12">

          {/* Cột Trái (4/12): Hốc lõm danh sách sự cố */}
          <div className="flex min-h-0 flex-col rounded-[24px] border border-black/[0.03] p-3.5 shadow-[inset_5px_5px_12px_rgba(0,0,0,0.055),inset_-5px_-5px_12px_rgba(255,255,255,0.75)] sm:p-4 xl:col-span-4 xl:overflow-y-auto dark:border-white/[0.04] dark:shadow-[inset_6px_6px_14px_rgba(0,0,0,0.45),inset_-4px_-4px_10px_rgba(255,255,255,0.025)]">
            <IncidentCardList
              incidents={incidents}
              selectedId={selectedIncident?.id ?? null}
              onSelect={handleSelectCard}
              highlightedId={highlightedId}
              canSelectRows={canSelectRows}
              selectedIdSet={selectedIdSet}
              onToggleRowSelection={onToggleRowSelection}
              loading={loading}
              fetching={fetching}
              error={error}
              onRetry={onRetry}
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPageChange={onPageChange}
              onLimitChange={onLimitChange}
            />
          </div>

          {/* Cột Phải (8/12): Hốc lõm chi tiết sự cố */}
          <div className="hidden min-h-0 flex-col rounded-[24px] border border-black/[0.03] p-5 shadow-[inset_5px_5px_12px_rgba(0,0,0,0.055),inset_-5px_-5px_12px_rgba(255,255,255,0.75)] sm:p-6 xl:col-span-8 xl:flex xl:overflow-y-auto dark:border-white/[0.04] dark:shadow-[inset_6px_6px_14px_rgba(0,0,0,0.45),inset_-4px_-4px_10px_rgba(255,255,255,0.025)]">
            <IncidentQuickDetailPanel
              incident={selectedIncident}
              onReview={onReview}
              onAssign={onAssign}
              onResolve={onResolve}
              onCloseIncident={onClose}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>

        </div>
      </div>

      {/* Responsive Detail Overlay for Mobile / Tablet (< xl) */}
      {mobileDrawerOpen && selectedIncident && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-md transition-opacity duration-300 sm:items-center sm:p-6 xl:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-black/[0.05] bg-inherit p-5 shadow-[16px_16px_32px_rgba(0,0,0,0.12),-16px_-16px_32px_rgba(255,255,255,0.85)] sm:p-6 dark:border-white/[0.08] dark:shadow-[16px_16px_36px_rgba(0,0,0,0.65),-10px_-10px_24px_rgba(255,255,255,0.03)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.12),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] sm:hidden dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.04)]" />

            <IncidentQuickDetailPanel
              incident={selectedIncident}
              onReview={onReview}
              onAssign={onAssign}
              onResolve={onResolve}
              onCloseIncident={onClose}
              onEdit={onEdit}
              onDelete={onDelete}
              onCloseDrawer={() => setMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
