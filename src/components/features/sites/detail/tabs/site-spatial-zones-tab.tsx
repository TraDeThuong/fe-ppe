"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  Camera,
  ExternalLink,
  Layers,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCameras } from "@/hooks/cameras";
import {
  useCreateZone,
  useDeleteZone,
  useSiteZones,
} from "@/hooks/sites/use-site-zones";
import {
  useCreateRestrictedArea,
  useDeleteRestrictedArea,
  useRestrictedAreas,
} from "@/hooks/sites/use-restricted-areas";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteSpatialZonesTabProps {
  site: SiteItem;
}

export function SiteSpatialZonesTab({ site }: SiteSpatialZonesTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Cameras data to count cameras per zone
  const { data: camerasData } = useCameras({ siteId: site.id, limit: 100 });
  const cameras = useMemo(() => camerasData?.items ?? [], [camerasData]);

  // Zones data & mutations
  const { data: zones = [], isLoading: zonesLoading } = useSiteZones(site.id);
  const createZoneMutation = useCreateZone();
  const deleteZoneMutation = useDeleteZone();

  // Restricted areas data & mutations
  const { data: restrictedAreas = [], isLoading: areasLoading } = useRestrictedAreas(
    site.id
  );
  const createAreaMutation = useCreateRestrictedArea();
  const deleteAreaMutation = useDeleteRestrictedArea();

  // Form states for quick add
  const [showAddZone, setShowAddZone] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");

  const [showAddArea, setShowAddArea] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaSeverity, setAreaSeverity] = useState<"CRITICAL" | "HIGH">("CRITICAL");
  const [areaZoneId, setAreaZoneId] = useState("");
  const [areaDescription, setAreaDescription] = useState("");

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;

    const generatedCode = "ZONE-" + zoneName.trim().toUpperCase().replace(/\s+/g, "-");

    await createZoneMutation.mutateAsync({
      siteId: site.id,
      payload: {
        name: zoneName.trim(),
        code: generatedCode,
        description: zoneDescription.trim() || undefined,
      },
    });

    setZoneName("");
    setZoneDescription("");
    setShowAddZone(false);
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim()) return;

    await createAreaMutation.mutateAsync({
      siteId: site.id,
      payload: {
        name: areaName.trim(),
        severity: areaSeverity,
        zoneId: areaZoneId || undefined,
        description: areaDescription.trim() || undefined,
      },
    });

    setAreaName("");
    setAreaDescription("");
    setAreaZoneId("");
    setShowAddArea(false);
  };

  

return (
  <div className="space-y-5">
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
      {/* =====================================================
          1. CONSTRUCTION ZONES
      ===================================================== */}
      <section
        className="
          relative min-w-0 overflow-hidden rounded-[24px] p-4 sm:p-5
          border border-border/20 bg-surface
          shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.88)]
          transition-shadow duration-300
          dark:border-transparent dark:bg-card
          dark:shadow-[8px_8px_18px_rgba(0,0,0,0.48),-3px_-3px_9px_rgba(255,255,255,0.025)]
        "
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]
                border border-border/20 bg-surface-elevated text-primary
                shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,0.9)]
                dark:border-transparent dark:bg-card
                dark:shadow-[4px_4px_9px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.025)]
              "
            >
              <Layers className="h-5 w-5 stroke-[1.8]" />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
                {isVietnamese ? "Phân khu thi công" : "Construction Zones"}
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Quản lý khu vực & camera"
                  : "Area & camera management"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddZone((v) => !v)}
            aria-expanded={showAddZone}
            className="
              group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3
              border border-primary/20 bg-primary/[0.08] text-xs font-bold text-primary
              shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_rgba(255,255,255,0.85)]
              transition-all duration-200
              hover:-translate-y-0.5 hover:bg-primary/[0.13]
              hover:shadow-[6px_6px_12px_var(--shadow-dark),-5px_-5px_10px_rgba(255,255,255,0.9)]
              active:translate-y-[1px] active:shadow-[inset_3px_3px_6px_var(--shadow-dark)]
              dark:border-transparent dark:bg-primary/[0.10]
              dark:shadow-[4px_4px_9px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]
              dark:hover:border-transparent dark:hover:bg-primary/[0.14]
              dark:hover:shadow-[6px_6px_12px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.02)]
            "
          >
            <Plus
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                showAddZone ? "rotate-45" : "group-hover:rotate-90"
              }`}
            />
            <span>{isVietnamese ? "Thêm khu" : "Add zone"}</span>
          </button>
        </div>

        {/* Summary */}
        <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-3">
          <div
            className="
              rounded-2xl border border-border/10 bg-background/50 p-3.5
              shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.8)]
              dark:border-transparent dark:bg-background/40
              dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]
            "
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {isVietnamese ? "TỔNG PHÂN KHU" : "TOTAL ZONES"}
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-3xl font-black leading-none tracking-tight text-foreground tabular-nums">
                {zones.length.toString().padStart(2, "0")}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isVietnamese ? "khu vực" : "areas"}
              </span>
            </div>
          </div>

          <div
            className="
              flex h-[62px] w-[62px] items-center justify-center rounded-[19px]
              border border-border/20 bg-surface-elevated text-primary
              shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,0.9)]
              dark:border-transparent dark:bg-card
              dark:shadow-[4px_4px_9px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.025)]
            "
          >
            <div className="text-center">
              <Camera className="mx-auto h-4 w-4" />
              <span className="mt-1 block text-[10px] font-extrabold tabular-nums">
                {cameras.length}
              </span>
            </div>
          </div>
        </div>

        {/* Add Zone Form */}
        {showAddZone && (
          <form
            onSubmit={handleAddZone}
            className="
              mt-4 space-y-3 rounded-[18px] p-3.5 sm:p-4
              border border-primary/15 bg-background/55
              shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_rgba(255,255,255,0.75)]
              dark:border-transparent dark:bg-background/40
              dark:shadow-[inset_4px_4px_9px_rgba(0,0,0,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]
            "
          >
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-primary" />
              <h4 className="text-xs font-extrabold text-foreground">
                {isVietnamese ? "Tạo phân khu mới" : "Create a new zone"}
              </h4>
            </div>

            <input
              type="text"
              placeholder={
                isVietnamese
                  ? "Tên phân khu (VD: Zone A - Khu móng hầm)"
                  : "Zone name (e.g.: Zone A - Excavation)"
              }
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              className="
                h-10 w-full rounded-xl border border-border/15 bg-surface/70 px-3.5
                text-xs text-foreground
                shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]
                placeholder:text-muted-foreground/65
                focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10
                dark:border-transparent dark:bg-card/70
                dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-1px_-1px_4px_rgba(255,255,255,0.02)]
              "
              required
            />

            <input
              type="text"
              placeholder={
                isVietnamese
                  ? "Mô tả phân khu (tùy chọn)"
                  : "Description (optional)"
              }
              value={zoneDescription}
              onChange={(e) => setZoneDescription(e.target.value)}
              className="
                h-10 w-full rounded-xl border border-border/15 bg-surface/70 px-3.5
                text-xs text-foreground
                shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]
                placeholder:text-muted-foreground/65
                focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10
                dark:border-transparent dark:bg-card/70
                dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-1px_-1px_4px_rgba(255,255,255,0.02)]
              "
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddZone(false)}
                className="h-8 rounded-lg px-3 text-xs"
              >
                {isVietnamese ? "Hủy" : "Cancel"}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createZoneMutation.isPending}
                className="
                  h-8 rounded-xl px-4 text-xs
                  shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.65)]
                  dark:shadow-[3px_3px_6px_rgba(0,0,0,0.35)]
                "
              >
                {createZoneMutation.isPending
                  ? isVietnamese
                    ? "Đang lưu..."
                    : "Saving..."
                  : isVietnamese
                    ? "Lưu phân khu"
                    : "Save zone"}
              </Button>
            </div>
          </form>
        )}

        {/* Zones List */}
        <div className="mt-4">
          {zonesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[76px] animate-pulse rounded-2xl bg-surface-elevated/60 shadow-[inset_2px_2px_5px_var(--shadow-dark)]"
                />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 px-4 py-9 text-center dark:border-transparent">
              <Layers className="mx-auto h-7 w-7 text-muted-foreground/45" />
              <p className="mx-auto mt-3 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? 'Chưa có phân khu nào. Nhấn "Thêm khu" để bắt đầu.'
                  : 'No zones yet. Click "Add zone" to get started.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((zone, index) => {
                const zoneCameras = cameras.filter(
                  (c) => c.zoneId === zone.id,
                );

                return (
                  <div
                    key={zone.id}
                    className="
                      group relative min-w-0 rounded-[17px] p-3.5
                      border border-border/15 bg-surface
                      shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_rgba(255,255,255,0.9)]
                      transition-[transform,box-shadow,background-color] duration-200
                      hover:-translate-y-0.5 hover:border-primary/20
                      hover:shadow-[7px_7px_14px_var(--shadow-dark),-6px_-6px_12px_rgba(255,255,255,0.95)]
                      dark:border-transparent dark:bg-card
                      dark:shadow-[5px_5px_11px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]
                      dark:hover:border-transparent dark:hover:bg-card
                      dark:hover:shadow-[7px_7px_15px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.02)]
                    "
                  >
                    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-transparent" />

                    <div className="flex items-start gap-3">
                      <div
                        className="
                          flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                          border border-primary/10 bg-primary/[0.07] text-primary
                          shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_rgba(255,255,255,0.85)]
                          dark:border-transparent dark:bg-primary/10
                          dark:shadow-[3px_3px_6px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.02)]
                        "
                      >
                        <span className="font-mono text-xs font-black">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="break-words text-xs font-extrabold text-foreground">
                            {zone.name}
                          </h4>
                          <span className="rounded-md border border-border/20 bg-background/50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground dark:border-transparent">
                            {zone.code}
                          </span>
                        </div>

                        {zone.description && (
                          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {zone.description}
                          </p>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/[0.06] px-2 py-1 text-[10px] font-semibold text-primary dark:border-transparent">
                            <Camera className="h-3 w-3" />
                            {zoneCameras.length}{" "}
                            {isVietnamese ? "camera" : "cameras"}
                          </span>

                          {zoneCameras.length > 0 && (
                            <Link
                              href={`/cameras?siteId=${site.id}&zoneId=${zone.id}`}
                              title={
                                isVietnamese
                                  ? "Xem danh sách camera của phân khu này"
                                  : "View cameras in this zone"
                              }
                              className="
                                inline-flex items-center gap-1 rounded-lg px-2 py-1
                                text-[10px] font-bold text-primary transition-colors
                                hover:bg-primary/10
                                dark:hover:bg-primary/[0.08]
                              "
                            >
                              {isVietnamese ? "Xem camera" : "View cameras"}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deleteZoneMutation.mutate({
                            siteId: site.id,
                            zoneId: zone.id,
                            name: zone.name,
                          })
                        }
                        disabled={deleteZoneMutation.isPending}
                        title={isVietnamese ? "Xóa phân khu" : "Delete zone"}
                        aria-label={`${isVietnamese ? "Xóa phân khu" : "Delete zone"} ${zone.name}`}
                        className="
                          flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                          border border-transparent text-muted-foreground/65
                          transition-colors duration-200
                          hover:border-danger/20 hover:bg-danger/10 hover:text-danger
                          active:scale-95
                          disabled:cursor-not-allowed disabled:opacity-40
                          dark:border-transparent dark:hover:border-transparent
                          dark:hover:bg-danger/[0.10] dark:hover:text-danger
                        "
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          2. RESTRICTED DANGER AREAS
      ===================================================== */}
      <section
        className="
          relative min-w-0 overflow-hidden rounded-[24px] p-4 sm:p-5
          border border-danger/10 bg-surface
          shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.88)]
          transition-shadow duration-300
          dark:border-transparent dark:bg-card
          dark:shadow-[8px_8px_18px_rgba(0,0,0,0.48),-3px_-3px_9px_rgba(255,255,255,0.025)]
        "
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-danger/20 to-transparent dark:via-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]
                border border-danger/10 bg-danger/[0.08] text-danger
                shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,0.9)]
                dark:border-transparent dark:bg-danger/[0.10]
                dark:shadow-[4px_4px_9px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)]
              "
            >
              <AlertOctagon className="h-5 w-5 stroke-[1.8]" />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
                {isVietnamese ? "Vùng cấm nguy hiểm" : "Restricted Areas"}
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Khu vực kiểm soát nghiêm ngặt"
                  : "High-risk area monitoring"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddArea((v) => !v)}
            aria-expanded={showAddArea}
            className="
              group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3
              border border-danger/20 bg-danger/[0.08] text-xs font-bold text-danger
              shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_rgba(255,255,255,0.85)]
              transition-all duration-200
              hover:-translate-y-0.5 hover:bg-danger/[0.12]
              hover:shadow-[6px_6px_12px_var(--shadow-dark),-5px_-5px_10px_rgba(255,255,255,0.9)]
              active:translate-y-[1px] active:shadow-[inset_3px_3px_6px_var(--shadow-dark)]
              dark:border-transparent dark:bg-danger/[0.10]
              dark:shadow-[4px_4px_9px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]
              dark:hover:border-transparent dark:hover:bg-danger/[0.14]
              dark:hover:shadow-[6px_6px_12px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.02),0_0_12px_rgba(239,68,68,0.08)]
            "
          >
            <Plus
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                showAddArea ? "rotate-45" : "group-hover:rotate-90"
              }`}
            />
            <span>{isVietnamese ? "Thêm vùng cấm" : "Add area"}</span>
          </button>
        </div>

        {/* Danger Summary */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div
            className="
              rounded-2xl border border-border/10 bg-background/50 p-3.5
              shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.8)]
              dark:border-transparent dark:bg-background/40
              dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]
            "
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {isVietnamese ? "TỔNG VÙNG CẤM" : "TOTAL AREAS"}
            </p>
            <p className="mt-1.5 text-3xl font-black leading-none tracking-tight text-foreground tabular-nums">
              {restrictedAreas.length.toString().padStart(2, "0")}
            </p>
          </div>

          <div
            className="
              rounded-2xl border border-danger/10 bg-danger/[0.045] p-3.5
              shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.7)]
              dark:border-transparent dark:bg-danger/[0.06]
              dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]
            "
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-danger/80">
              {isVietnamese ? "MỨC NGUY CẤP" : "CRITICAL"}
            </p>
            <p className="mt-1.5 text-3xl font-black leading-none tracking-tight text-danger tabular-nums">
              {restrictedAreas
                .filter((area) => (area.severity || "CRITICAL") === "CRITICAL")
                .length.toString()
                .padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Add Restricted Area Form */}
        {showAddArea && (
          <form
            onSubmit={handleAddArea}
            className="
              mt-4 space-y-3 rounded-[18px] p-3.5 sm:p-4
              border border-danger/15 bg-background/55
              shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_rgba(255,255,255,0.75)]
              dark:border-transparent dark:bg-background/40
              dark:shadow-[inset_4px_4px_9px_rgba(0,0,0,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]
            "
          >
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-danger" />
              <h4 className="text-xs font-extrabold text-foreground">
                {isVietnamese
                  ? "Thiết lập vùng cấm mới"
                  : "Configure restricted area"}
              </h4>
            </div>

            <input
              type="text"
              placeholder={
                isVietnamese
                  ? "Tên vùng cấm (VD: Miệng hố thang máy tầng 15)"
                  : "Area name (e.g.: Level 15 elevator shaft)"
              }
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              className="
                h-10 w-full rounded-xl border border-border/15 bg-surface/70 px-3.5
                text-xs text-foreground
                shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]
                placeholder:text-muted-foreground/65
                focus:border-danger/40 focus:outline-none focus:ring-2 focus:ring-danger/10
                dark:border-transparent dark:bg-card/70
                dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-1px_-1px_4px_rgba(255,255,255,0.02)]
                dark:focus:border-danger/30
              "
              required
            />

            <select
              value={areaSeverity}
              onChange={(e) =>
                setAreaSeverity(e.target.value as "CRITICAL" | "HIGH")
              }
              className="
                h-10 w-full rounded-xl border border-border/15 bg-surface/70 px-3.5
                text-xs text-foreground
                shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]
                focus:border-danger/40 focus:outline-none focus:ring-2 focus:ring-danger/10
                dark:border-transparent dark:bg-card/70
                dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-1px_-1px_4px_rgba(255,255,255,0.02)]
                dark:focus:border-danger/30
              "
            >
              <option value="CRITICAL">
                {isVietnamese
                  ? "Mức độ: NGUY CẤP (CRITICAL)"
                  : "Severity: CRITICAL"}
              </option>
              <option value="HIGH">
                {isVietnamese
                  ? "Mức độ: NGUY HIỂM CAO (HIGH)"
                  : "Severity: HIGH"}
              </option>
            </select>

            {zones.length > 0 && (
              <select
                value={areaZoneId}
                onChange={(e) => setAreaZoneId(e.target.value)}
                className="
                  h-10 w-full rounded-xl border border-border/15 bg-surface/70 px-3.5
                  text-xs text-foreground
                  shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]
                  focus:border-danger/40 focus:outline-none focus:ring-2 focus:ring-danger/10
                  dark:border-transparent dark:bg-card/70
                  dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-1px_-1px_4px_rgba(255,255,255,0.02)]
                  dark:focus:border-danger/30
                "
              >
                <option value="">
                  {isVietnamese
                    ? "Thuộc phân khu (Tùy chọn)"
                    : "Assigned zone (optional)"}
                </option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            )}

            <textarea
              placeholder={
                isVietnamese
                  ? "Mô tả lý do nguy hiểm / quy tắc phản ứng"
                  : "Hazard description / response rules"
              }
              value={areaDescription}
              onChange={(e) => setAreaDescription(e.target.value)}
              rows={2}
              className="
                w-full resize-y rounded-xl border border-border/15 bg-surface/70 px-3.5 py-3
                text-xs leading-relaxed text-foreground
                shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]
                placeholder:text-muted-foreground/65
                focus:border-danger/40 focus:outline-none focus:ring-2 focus:ring-danger/10
                dark:border-transparent dark:bg-card/70
                dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-1px_-1px_4px_rgba(255,255,255,0.02)]
                dark:focus:border-danger/30
              "
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddArea(false)}
                className="h-8 rounded-lg px-3 text-xs"
              >
                {isVietnamese ? "Hủy" : "Cancel"}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createAreaMutation.isPending}
                className="
                  h-8 rounded-xl px-4 text-xs
                  shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.65)]
                  dark:shadow-[3px_3px_6px_rgba(0,0,0,0.35)]
                "
              >
                {createAreaMutation.isPending
                  ? isVietnamese
                    ? "Đang lưu..."
                    : "Saving..."
                  : isVietnamese
                    ? "Lưu vùng cấm"
                    : "Save area"}
              </Button>
            </div>
          </form>
        )}

        {/* Restricted Areas List */}
        <div className="mt-4">
          {areasLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[76px] animate-pulse rounded-2xl bg-surface-elevated/60 shadow-[inset_2px_2px_5px_var(--shadow-dark)]"
                />
              ))}
            </div>
          ) : restrictedAreas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-danger/20 bg-danger/[0.025] px-4 py-9 text-center dark:border-transparent">
              <ShieldCheck className="mx-auto h-7 w-7 text-muted-foreground/45" />
              <p className="mx-auto mt-3 max-w-[280px] text-xs leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? 'Chưa có vùng cấm nguy hiểm. Nhấn "Thêm vùng cấm" để cấu hình giám sát.'
                  : 'No restricted areas defined. Add an area to configure monitoring.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {restrictedAreas.map((area) => {
                const parentZone = zones.find((z) => z.id === area.zoneId);
                const isCritical = (area.severity || "CRITICAL") === "CRITICAL";

                return (
                  <div
                    key={area.id}
                    className={`
                      group relative min-w-0 overflow-hidden rounded-[17px] p-3.5
                      border bg-surface
                      shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,0.88)]
                      transition-[transform,box-shadow,background-color] duration-200
                      hover:-translate-y-0.5
                      hover:shadow-[7px_7px_14px_var(--shadow-dark),-6px_-6px_12px_rgba(255,255,255,0.92)]
                      dark:border-transparent dark:bg-card
                      dark:shadow-[5px_5px_11px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]
                      dark:hover:border-transparent dark:hover:bg-card
                      dark:hover:shadow-[7px_7px_15px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.02),0_0_10px_rgba(239,68,68,0.07)]
                      ${
                        isCritical
                          ? "border-danger/15"
                          : "border-accent/25"
                      }
                    `}
                  >
                    {/* Severity accent rail */}
                    <div
                      className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full ${
                        isCritical ? "bg-danger" : "bg-accent"
                      }`}
                    />

                    <div className="flex items-start gap-3 pl-1">
                      <div
                        className={`
                          flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                          border shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_rgba(255,255,255,0.8)]
                          dark:border-transparent
                          dark:shadow-[3px_3px_6px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.02)]
                          ${
                            isCritical
                              ? "border-danger/10 bg-danger/[0.08] text-danger dark:bg-danger/[0.10]"
                              : "border-accent/20 bg-accent/10 text-accent dark:bg-accent/15"
                          }
                        `}
                      >
                        <AlertOctagon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="break-words text-xs font-extrabold leading-relaxed text-foreground">
                          {area.name}
                        </h4>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`
                              inline-flex items-center gap-1 rounded-lg border px-2 py-1
                              text-[9px] font-extrabold tracking-wide
                              ${
                                isCritical
                                  ? "border-danger/20 bg-danger/[0.09] text-danger dark:border-transparent dark:bg-danger/[0.12]"
                                  : "border-accent/25 bg-accent/10 text-accent dark:border-transparent dark:bg-accent/15"
                              }
                            `}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isCritical ? "bg-danger" : "bg-accent"
                              }`}
                            />
                            {area.severity || "CRITICAL"}
                          </span>

                          {parentZone && (
                            <span className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border/20 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground dark:border-transparent">
                              <Layers className="h-3 w-3 shrink-0" />
                              <span className="break-words">{parentZone.name}</span>
                            </span>
                          )}
                        </div>

                        {area.description && (
                          <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                            {area.description}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deleteAreaMutation.mutate({
                            siteId: site.id,
                            areaId: area.id,
                            name: area.name,
                          })
                        }
                        disabled={deleteAreaMutation.isPending}
                        title={
                          isVietnamese
                            ? "Xóa vùng cấm"
                            : "Delete restricted area"
                        }
                        aria-label={`${isVietnamese ? "Xóa vùng cấm" : "Delete restricted area"} ${area.name}`}
                        className="
                          flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                          border border-transparent text-muted-foreground/65
                          transition-colors duration-200
                          hover:border-danger/15 hover:bg-danger/[0.08] hover:text-danger
                          active:scale-95
                          disabled:cursor-not-allowed disabled:opacity-40
                          dark:border-transparent dark:hover:border-transparent
                          dark:hover:bg-danger/[0.12] dark:hover:text-danger
                        "
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  </div>
);
}