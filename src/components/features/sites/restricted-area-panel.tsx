"use client";

import { useState } from "react";
import { AlertOctagon, Edit2, Plus, ShieldAlert, Sliders, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RestrictedAreaDrawer } from "./restricted-area-drawer";
import { useDeleteRestrictedArea, useRestrictedAreas } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import type { RestrictedAreaItem } from "@/types";

export interface RestrictedAreaPanelProps {
  siteId: string;
}

export function RestrictedAreaPanel({ siteId }: RestrictedAreaPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { data: areas = [], isLoading } = useRestrictedAreas(siteId, Boolean(siteId));
  const deleteArea = useDeleteRestrictedArea();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<RestrictedAreaItem | null>(null);

  const handleOpenCreate = () => {
    setSelectedArea(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (area: RestrictedAreaItem) => {
    setSelectedArea(area);
    setDrawerOpen(true);
  };

  const handleDelete = async (area: RestrictedAreaItem) => {
    await deleteArea.mutateAsync({
      siteId,
      areaId: area.id,
      name: area.name,
    });
  };

  return (
    <div className="space-y-4">
      {/* Add Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenCreate}
        className="flex items-center gap-1.5 text-xs w-full justify-center text-danger hover:text-danger border-danger/30 hover:bg-danger/10 shadow-sm"
      >
        <Plus className="h-4 w-4" />
        <span>{t("sites.restricted.addArea")}</span>
      </Button>

      {/* Areas List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-elevated/40" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-surface/30 p-8 text-center text-xs text-muted-foreground">
            {t("sites.restricted.empty")}
          </div>
        ) : (
          areas.map((area) => {
            const pointCount = Array.isArray(area.boundary) ? area.boundary.length : 0;
            const hasValidBoundary = pointCount >= 3;

            return (
              <div
                key={area.id}
                className="flex items-center justify-between rounded-xl border border-border/40 bg-surface/60 p-3 shadow-nm-inset transition hover:border-danger/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                    <AlertOctagon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-bold text-foreground truncate">{area.name}</p>
                      <span className="rounded bg-danger/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-danger uppercase border border-danger/20">
                        {area.severity || "CRITICAL"}
                      </span>
                      {hasValidBoundary ? (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {pointCount} {isVietnamese ? "điểm ranh giới" : "pts"}
                        </span>
                      ) : (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {isVietnamese ? "Chưa vẽ ranh giới" : "No boundary"}
                        </span>
                      )}
                    </div>

                    {area.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {area.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(area)}
                    title={isVietnamese ? "Vẽ lại / Sửa ranh giới vùng cấm" : "Edit danger boundary"}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-danger transition"
                  >
                    <Sliders className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(area)}
                    disabled={deleteArea.isPending}
                    title={isVietnamese ? "Xóa vùng cấm" : "Delete area"}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-danger transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Boundary Canvas Drawer */}
      <RestrictedAreaDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        siteId={siteId}
        area={selectedArea}
      />
    </div>
  );
}
