"use client";

import { Camera, CheckCircle2, Columns2, Inbox, Layers, List, X } from "lucide-react";
import type { CameraIncidentGroup } from "@/lib/incident-workflow";
import type { IncidentViewMode } from "../incident-table";

export interface IncidentQuickSelectBarProps {
  hasIncidents: boolean;
  emptyMessage?: string;
  isVietnamese: boolean;
  history: boolean;
  viewMode: IncidentViewMode;
  onViewModeChange: (mode: IncidentViewMode) => void;
  personClustersCount: number;
  canSelectRows: boolean;
  canBatchReview: boolean;
  isOfficerRole: boolean;
  canBatchResolve: boolean;
  allPagePendingIds: string[];
  allPageMyConfirmedIds: string[];
  cameraGroups: CameraIncidentGroup[];
  selectedIdSet: Set<string>;
  onToggleGroupSelection: (ids: string[]) => void;
  onClearSelection: () => void;
}

export function IncidentQuickSelectBar({
  hasIncidents,
  emptyMessage,
  isVietnamese,
  history,
  viewMode,
  onViewModeChange,
  personClustersCount,
  canSelectRows,
  canBatchReview,
  isOfficerRole,
  canBatchResolve,
  allPagePendingIds,
  allPageMyConfirmedIds,
  cameraGroups,
  selectedIdSet,
  onToggleGroupSelection,
  onClearSelection,
}: IncidentQuickSelectBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {hasIncidents ? (
          <>
            {canBatchReview && allPagePendingIds.length > 0 && (
              <button
                type="button"
                onClick={() => onToggleGroupSelection(allPagePendingIds)}
                className="mr-1 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-700 transition hover:bg-amber-500/25 dark:text-amber-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {isVietnamese
                    ? `Chọn chờ duyệt (${allPagePendingIds.length})`
                    : `Select Pending (${allPagePendingIds.length})`}
                </span>
              </button>
            )}

            {isOfficerRole && canBatchResolve && allPageMyConfirmedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onToggleGroupSelection(allPageMyConfirmedIds)}
                className="mr-1 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-500/25 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {isVietnamese
                    ? `Chọn việc của tôi (${allPageMyConfirmedIds.length})`
                    : `Select My Tasks (${allPageMyConfirmedIds.length})`}
                </span>
              </button>
            )}

            <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span>
                {isVietnamese ? "Chọn nhanh theo Camera:" : "Quick select by Camera:"}
              </span>
            </span>

            {cameraGroups.map((grp) => {
              const targetIds = grp.items.map((i) => i.id);
              const selectedCount = targetIds.filter((id) => selectedIdSet.has(id)).length;
              const allSelected = selectedCount > 0 && selectedCount === targetIds.length;
              return (
                <button
                  key={grp.cameraKey}
                  type="button"
                  disabled={!canSelectRows}
                  onClick={() => onToggleGroupSelection(targetIds)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition ${
                    allSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : selectedCount > 0
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border/50 bg-background/70 text-foreground hover:border-primary/40 hover:text-primary"
                  } disabled:opacity-60`}
                  title={
                    isVietnamese
                      ? `Bấm để chọn/bỏ chọn ${grp.items.length} sự cố của ${grp.cameraLabel}`
                      : `Toggle ${grp.items.length} incidents from ${grp.cameraLabel}`
                  }
                >
                  <span className="max-w-[160px] truncate">{grp.cameraLabel}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                      allSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selectedCount > 0 ? `${selectedCount}/` : ""}
                    {grp.items.length}
                  </span>
                </button>
              );
            })}

            {selectedIdSet.size > 0 && (
              <button
                type="button"
                onClick={onClearSelection}
                className="inline-flex items-center gap-1 rounded-xl border border-border/50 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-danger"
              >
                <X className="h-3 w-3" />
                <span>
                  {isVietnamese
                    ? `Bỏ chọn (${selectedIdSet.size})`
                    : `Clear (${selectedIdSet.size})`}
                </span>
              </button>
            )}
          </>
        ) : (
          <div role="status">
            {emptyMessage ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Inbox aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <span>{emptyMessage}</span>
              </p>
            ) : null}
          </div>
        )}
      </div>

      {!history && (
        <div
          role="group"
          aria-label={isVietnamese ? "Chọn chế độ hiển thị" : "Select display mode"}
          className="inline-flex max-w-full flex-wrap items-center rounded-xl border border-border/50 bg-background/70 p-0.5 shadow-nm-inset"
        >
          <button
            type="button"
            aria-pressed={viewMode === "table"}
            onClick={() => onViewModeChange("table")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "table"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Bảng" : "Table"}</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "grouped"}
            onClick={() => onViewModeChange("grouped")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "grouped"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>
              {isVietnamese
                ? `Gom đa sự cố (${personClustersCount})`
                : `Grouped (${personClustersCount})`}
            </span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "split"}
            onClick={() => onViewModeChange("split")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "split"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Chia 2 cột" : "Split View"}</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "camera"}
            onClick={() => onViewModeChange("camera")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "camera"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Gom theo Camera" : "Group by Camera"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
