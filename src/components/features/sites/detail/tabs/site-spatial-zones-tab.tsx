"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Camera,
  Edit2,
  ExternalLink,
  Layers,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  extractPlottedBoundaryPoints,
  RestrictedAreaDrawer,
} from "@/components/features/sites/restricted-area-drawer";
import { useCameras } from "@/hooks/cameras";
import {
  useCreateZone,
  useDeleteZone,
  useSiteZones,
  useUpdateZone,
} from "@/hooks/sites/use-site-zones";
import {
  useDeleteRestrictedArea,
  useRestrictedAreas,
  useUpdateRestrictedArea,
} from "@/hooks/sites/use-restricted-areas";
import { useCan } from "@/hooks/use-can";
import { isCodeTaken, sanitizeManualCode } from "@/lib/code-generator";
import { useLocale } from "@/providers/locale-provider";
import { generateUniqueZoneCode } from "../../site-helpers";
import type { RestrictedAreaItem, SiteItem, ZoneItem, ZoneStatus } from "@/types";

export interface SiteSpatialZonesTabProps {
  site: SiteItem;
  onViewZoneCameras?: (zoneId: string) => void;
  onViewZoneIncidents?: (zoneId: string) => void;
}

export function SiteSpatialZonesTab({
  site,
  onViewZoneCameras,
  onViewZoneIncidents,
}: SiteSpatialZonesTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canReadCameras = can("PPE_CAMERA_READ");
  const canReadZones = can("PPE_ZONE_READ");
  const canReadAreas = can("PPE_RESTRICTED_AREA_READ");
  const canManageZones = can("PPE_ZONE_MANAGE");
  const canManageAreas = can("PPE_RESTRICTED_AREA_MANAGE");
  const isSiteActive = site.status === "ACTIVE";

  // Cameras data to count cameras per zone
  const { data: camerasData } = useCameras(
    { siteId: site.id, limit: 100 },
    { enabled: canReadCameras && Boolean(site.id) },
  );
  const cameras = useMemo(() => camerasData?.items ?? [], [camerasData]);

  // Zones data & mutations
  const {
    data: zones = [],
    isLoading: zonesLoading,
    error: zonesError,
  } = useSiteZones(site.id, canReadZones);
  const createZoneMutation = useCreateZone();
  const updateZoneMutation = useUpdateZone();
  const deleteZoneMutation = useDeleteZone();

  // Restricted areas data & mutations
  const {
    data: restrictedAreas = [],
    isLoading: areasLoading,
    error: areasError,
  } = useRestrictedAreas(site.id, canReadAreas);
  const updateAreaMutation = useUpdateRestrictedArea();
  const deleteAreaMutation = useDeleteRestrictedArea();

  // Zone Create/Edit form state
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneItem | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneCode, setZoneCode] = useState("");
  const [isZoneCodeManual, setIsZoneCodeManual] = useState(false);
  const [zoneDescription, setZoneDescription] = useState("");
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus>("ACTIVE");

  const existingZoneCodes = useMemo(
    () =>
      zones
        .filter((z) => z.id !== editingZone?.id)
        .map((z) => z.code),
    [zones, editingZone],
  );

  // Delete Zone confirmation dialog
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<ZoneItem | null>(null);
  const [forceDeleteZone, setForceDeleteZone] = useState(false);

  // Restricted area filter & drawer state
  const [filterZoneId, setFilterZoneId] = useState<string>("");
  const [areaDrawerOpen, setAreaDrawerOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<RestrictedAreaItem | null>(null);

  const openCreateZone = () => {
    setEditingZone(null);
    setZoneName("");
    setZoneCode(generateUniqueZoneCode("", existingZoneCodes, true));
    setIsZoneCodeManual(false);
    setZoneDescription("");
    setZoneStatus("ACTIVE");
    setShowZoneForm((v) => !v);
  };

  const openEditZone = (zone: ZoneItem) => {
    setEditingZone(zone);
    setZoneName(zone.name);
    setZoneCode(zone.code);
    setIsZoneCodeManual(true);
    setZoneDescription(zone.description || "");
    setZoneStatus((zone.status as ZoneStatus) || "ACTIVE");
    setShowZoneForm(true);
  };

  const resetZoneForm = () => {
    setEditingZone(null);
    setZoneName("");
    setZoneCode("");
    setIsZoneCodeManual(false);
    setZoneDescription("");
    setZoneStatus("ACTIVE");
    setShowZoneForm(false);
  };

  const handleRandomizeZoneCode = () => {
    const nextCode = generateUniqueZoneCode(
      zoneName,
      [...existingZoneCodes, zoneCode],
      true,
    );
    setZoneCode(nextCode);
    setIsZoneCodeManual(false);
  };

  const handleZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;

    const sanitizedManual = sanitizeManualCode(zoneCode, "standard");
    const resolvedCode =
      sanitizedManual.length >= 2 &&
      !isCodeTaken(sanitizedManual, existingZoneCodes)
        ? sanitizedManual
        : generateUniqueZoneCode(zoneName, existingZoneCodes, false);

    if (editingZone) {
      await updateZoneMutation.mutateAsync({
        siteId: site.id,
        zoneId: editingZone.id,
        payload: {
          name: zoneName.trim(),
          code: resolvedCode,
          description: zoneDescription.trim() || undefined,
          status: zoneStatus,
        },
      });
    } else {
      await createZoneMutation.mutateAsync({
        siteId: site.id,
        payload: {
          name: zoneName.trim(),
          code: resolvedCode,
          description: zoneDescription.trim() || undefined,
          status: zoneStatus,
        },
      });
    }

    resetZoneForm();
  };

  const handleConfirmDeleteZone = async () => {
    if (!deleteZoneTarget) return;
    await deleteZoneMutation.mutateAsync({
      siteId: site.id,
      zoneId: deleteZoneTarget.id,
      name: deleteZoneTarget.name,
      force: forceDeleteZone,
    });
    if (filterZoneId === deleteZoneTarget.id) {
      setFilterZoneId("");
    }
    setDeleteZoneTarget(null);
    setForceDeleteZone(false);
  };

  const handleToggleAreaStatus = async (area: RestrictedAreaItem) => {
    const nextStatus = area.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    await updateAreaMutation.mutateAsync({
      siteId: site.id,
      areaId: area.id,
      payload: { status: nextStatus },
    });
  };

  const filteredAreas = useMemo(() => {
    if (!filterZoneId) return restrictedAreas;
    return restrictedAreas.filter((a) => a.zoneId === filterZoneId);
  }, [restrictedAreas, filterZoneId]);

  const activeAreasCount = useMemo(
    () => restrictedAreas.filter((a) => a.status !== "INACTIVE").length,
    [restrictedAreas],
  );

  const selectedFilterZone = useMemo(
    () => zones.find((z) => z.id === filterZoneId) || null,
    [zones, filterZoneId],
  );

  const deleteZoneLinkedAreasCount = useMemo(() => {
    if (!deleteZoneTarget) return 0;
    return restrictedAreas.filter((a) => a.zoneId === deleteZoneTarget.id).length;
  }, [deleteZoneTarget, restrictedAreas]);

  const deleteZoneLinkedCamerasCount = useMemo(() => {
    if (!deleteZoneTarget) return 0;
    return cameras.filter((c) => c.zoneId === deleteZoneTarget.id).length;
  }, [deleteZoneTarget, cameras]);

  const isZoneSaving = createZoneMutation.isPending || updateZoneMutation.isPending;

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
                    ? "Quản lý khu vực, trạng thái & camera"
                    : "Area, status & camera management"}
                </p>
              </div>
            </div>

            {canManageZones && isSiteActive && (
              <button
                type="button"
                onClick={openCreateZone}
                aria-expanded={showZoneForm && !editingZone}
                className="
                  group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3
                  border border-primary/20 bg-primary/[0.08] text-xs font-bold text-primary
                  shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_rgba(255,255,255,0.85)]
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:bg-primary/[0.13]
                  active:translate-y-[1px]
                  dark:border-transparent dark:bg-primary/[0.10]
                  dark:shadow-[4px_4px_9px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]
                "
              >
                <Plus
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    showZoneForm && !editingZone ? "rotate-45" : "group-hover:rotate-90"
                  }`}
                />
                <span>{isVietnamese ? "Thêm khu" : "Add zone"}</span>
              </button>
            )}
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

          {/* Create / Edit Zone Form */}
          {showZoneForm && canManageZones && (
            <form
              onSubmit={handleZoneSubmit}
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
                  {editingZone
                    ? isVietnamese
                      ? `Chỉnh sửa phân khu: ${editingZone.code}`
                      : `Edit zone: ${editingZone.code}`
                    : isVietnamese
                      ? "Tạo phân khu mới"
                      : "Create a new zone"}
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder={
                    isVietnamese
                      ? "Tên phân khu (VD: Khu móng hầm A)"
                      : "Zone name (e.g.: Zone A - Excavation)"
                  }
                  value={zoneName}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setZoneName(nextName);
                    if (!editingZone && !isZoneCodeManual) {
                      setZoneCode(
                        generateUniqueZoneCode(
                          nextName,
                          existingZoneCodes,
                          !nextName.trim(),
                        ),
                      );
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-border/15 bg-surface/70 px-3.5 text-xs text-foreground shadow-nm-inset focus:border-primary/30 focus:outline-none"
                  required
                />

                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder={
                      isVietnamese
                        ? "Mã phân khu (tự sinh hoặc nhập tay)"
                        : "Zone code (auto-generated or custom)"
                    }
                    value={zoneCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setZoneCode(val);
                      setIsZoneCodeManual(Boolean(val.trim()));
                    }}
                    className="h-10 w-full rounded-xl border border-border/15 bg-surface/70 pl-3.5 pr-20 font-mono text-xs uppercase text-foreground shadow-nm-inset focus:border-primary/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeZoneCode}
                    title={
                      isVietnamese
                        ? "Tạo mã phân khu ngẫu nhiên không trùng"
                        : "Randomize unique zone code"
                    }
                    className="absolute right-1.5 inline-flex items-center gap-1 rounded-lg border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 transition"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Random</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_150px]">
                <input
                  type="text"
                  placeholder={
                    isVietnamese
                      ? "Mô tả phân khu (tùy chọn)"
                      : "Description (optional)"
                  }
                  value={zoneDescription}
                  onChange={(e) => setZoneDescription(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border/15 bg-surface/70 px-3.5 text-xs text-foreground shadow-nm-inset focus:border-primary/30 focus:outline-none"
                />

                <select
                  value={zoneStatus}
                  onChange={(e) => setZoneStatus(e.target.value as ZoneStatus)}
                  aria-label={isVietnamese ? "Trạng thái phân khu" : "Zone status"}
                  className="h-10 w-full rounded-xl border border-border/15 bg-surface/70 px-3 text-xs font-semibold text-foreground shadow-nm-inset focus:border-primary/30 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetZoneForm}
                  className="h-8 rounded-lg px-3 text-xs"
                >
                  {isVietnamese ? "Hủy" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isZoneSaving}
                  className="h-8 rounded-xl px-4 text-xs"
                >
                  {isZoneSaving
                    ? isVietnamese
                      ? "Đang lưu..."
                      : "Saving..."
                    : editingZone
                      ? isVietnamese
                        ? "Cập nhật phân khu"
                        : "Update zone"
                      : isVietnamese
                        ? "Lưu phân khu"
                        : "Save zone"}
                </Button>
              </div>
            </form>
          )}

          {/* Zones List */}
          <div className="mt-4">
            {zonesError ? (
              <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-xs text-danger">
                {isVietnamese
                  ? "Không thể tải danh sách phân khu."
                  : "Failed to load zones."}
              </div>
            ) : zonesLoading ? (
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
                  const zoneCameras = cameras.filter((c) => c.zoneId === zone.id);
                  const zoneAreas = restrictedAreas.filter((a) => a.zoneId === zone.id);
                  const isFiltered = filterZoneId === zone.id;

                  return (
                    <div
                      key={zone.id}
                      className={`
                        group relative min-w-0 rounded-[17px] p-3.5
                        border bg-surface
                        shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_rgba(255,255,255,0.9)]
                        transition-[transform,box-shadow,background-color] duration-200
                        hover:-translate-y-0.5
                        dark:bg-card
                        dark:shadow-[5px_5px_11px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]
                        ${
                          isFiltered
                            ? "border-primary/40 ring-1 ring-primary/25"
                            : "border-border/15 hover:border-primary/20 dark:border-transparent"
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.07] text-primary">
                          <span className="font-mono text-xs font-black">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="break-words text-xs font-extrabold text-foreground">
                              {zone.name}
                            </h4>
                            <span className="rounded-md border border-border/20 bg-background/50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground">
                              {zone.code}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                zone.status === "ACTIVE"
                                  ? "bg-primary/10 text-primary"
                                  : zone.status === "MAINTENANCE"
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : "bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              {zone.status}
                            </span>
                          </div>

                          {zone.description && (
                            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                              {zone.description}
                            </p>
                          )}

                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            {onViewZoneCameras ? (
                              <button
                                type="button"
                                onClick={() => onViewZoneCameras(zone.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/[0.06] px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/15 transition"
                              >
                                <Camera className="h-3 w-3" />
                                <span>
                                  {zoneCameras.length} {isVietnamese ? "camera" : "cameras"}
                                </span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </button>
                            ) : (
                              <Link
                                href={`/cameras?siteId=${site.id}&zoneId=${zone.id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/[0.06] px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/15 transition"
                              >
                                <Camera className="h-3 w-3" />
                                <span>
                                  {zoneCameras.length} {isVietnamese ? "camera" : "cameras"}
                                </span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setFilterZoneId((prev) =>
                                  prev === zone.id ? "" : zone.id,
                                )
                              }
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                                isFiltered
                                  ? "border-danger/30 bg-danger/10 text-danger"
                                  : "border-border/30 bg-background/60 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <AlertOctagon className="h-3 w-3" />
                              <span>
                                {zoneAreas.length}{" "}
                                {isVietnamese ? "vùng cấm" : "restricted"}
                              </span>
                            </button>

                            {onViewZoneIncidents && (
                              <button
                                type="button"
                                onClick={() => onViewZoneIncidents(zone.id)}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-background/80 hover:text-primary transition"
                              >
                                <span>{isVietnamese ? "Sự cố" : "Incidents"}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {canManageZones && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditZone(zone)}
                              title={isVietnamese ? "Sửa phân khu" : "Edit zone"}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/70 hover:bg-primary/10 hover:text-primary transition"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setForceDeleteZone(false);
                                setDeleteZoneTarget(zone);
                              }}
                              disabled={deleteZoneMutation.isPending}
                              title={isVietnamese ? "Xóa phân khu" : "Delete zone"}
                              aria-label={`${isVietnamese ? "Xóa phân khu" : "Delete zone"} ${zone.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/70 hover:bg-danger/10 hover:text-danger transition disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
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
                    ? "Khu vực kiểm soát đa giác & trạng thái giám sát AI"
                    : "Polygon danger zones & AI enforcement status"}
                </p>
              </div>
            </div>

            {canManageAreas && isSiteActive && (
              <button
                type="button"
                onClick={() => {
                  setSelectedArea(null);
                  setAreaDrawerOpen(true);
                }}
                className="
                  group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3
                  border border-danger/20 bg-danger/[0.08] text-xs font-bold text-danger
                  shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_rgba(255,255,255,0.85)]
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:bg-danger/[0.12]
                  active:translate-y-[1px]
                  dark:border-transparent dark:bg-danger/[0.10]
                "
              >
                <Plus className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" />
                <span>{isVietnamese ? "Thêm vùng cấm" : "Add area"}</span>
              </button>
            )}
          </div>

          {/* Summary (Backed by real BE fields: total & ACTIVE count) */}
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
                {isVietnamese ? "ĐANG KÍCH HOẠT" : "ACTIVE"}
              </p>
              <p className="mt-1.5 text-3xl font-black leading-none tracking-tight text-danger tabular-nums">
                {activeAreasCount.toString().padStart(2, "0")}
              </p>
            </div>
          </div>

          {/* Zone filter indicator */}
          {selectedFilterZone && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary">
              <span>
                {isVietnamese
                  ? `Đang lọc vùng cấm thuộc phân khu: ${selectedFilterZone.name}`
                  : `Filtering areas in zone: ${selectedFilterZone.name}`}
              </span>
              <button
                type="button"
                onClick={() => setFilterZoneId("")}
                className="inline-flex items-center gap-1 font-bold hover:underline"
              >
                <X className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Hiện tất cả" : "Show all"}</span>
              </button>
            </div>
          )}

          {/* Restricted Areas List */}
          <div className="mt-4">
            {areasError ? (
              <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-xs text-danger">
                {isVietnamese
                  ? "Không thể tải danh sách vùng cấm."
                  : "Failed to load restricted areas."}
              </div>
            ) : areasLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[76px] animate-pulse rounded-2xl bg-surface-elevated/60 shadow-[inset_2px_2px_5px_var(--shadow-dark)]"
                  />
                ))}
              </div>
            ) : filteredAreas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-danger/20 bg-danger/[0.025] px-4 py-9 text-center dark:border-transparent">
                <ShieldCheck className="mx-auto h-7 w-7 text-muted-foreground/45" />
                <p className="mx-auto mt-3 max-w-[280px] text-xs leading-relaxed text-muted-foreground">
                  {selectedFilterZone
                    ? isVietnamese
                      ? `Chưa có vùng cấm nào gắn với phân khu "${selectedFilterZone.name}".`
                      : `No restricted areas assigned to "${selectedFilterZone.name}".`
                    : isVietnamese
                      ? 'Chưa có vùng cấm nguy hiểm. Nhấn "Thêm vùng cấm" để cấu hình giám sát.'
                      : "No restricted areas defined. Add an area to configure monitoring."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAreas.map((area) => {
                  const parentZone = zones.find((z) => z.id === area.zoneId);
                  const isAreaActive = area.status !== "INACTIVE";
                  const pointCount = extractPlottedBoundaryPoints(area.boundary).length;

                  return (
                    <div
                      key={area.id}
                      className={`
                        group relative min-w-0 overflow-hidden rounded-[17px] p-3.5
                        border bg-surface
                        shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,0.88)]
                        transition-[transform,box-shadow,background-color] duration-200
                        hover:-translate-y-0.5
                        dark:border-transparent dark:bg-card
                        dark:shadow-[5px_5px_11px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]
                        ${isAreaActive ? "border-danger/15" : "border-border/20 opacity-80"}
                      `}
                    >
                      <div
                        className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full ${
                          isAreaActive ? "bg-danger" : "bg-muted-foreground/40"
                        }`}
                      />

                      <div className="flex items-start gap-3 pl-1">
                        <div
                          className={`
                            flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border
                            ${
                              isAreaActive
                                ? "border-danger/10 bg-danger/[0.08] text-danger"
                                : "border-border/20 bg-muted/20 text-muted-foreground"
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
                                  isAreaActive
                                    ? "border-danger/20 bg-danger/[0.09] text-danger"
                                    : "border-border/30 bg-muted/30 text-muted-foreground"
                                }
                              `}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isAreaActive ? "bg-danger" : "bg-muted-foreground"
                                }`}
                              />
                              {area.status || "ACTIVE"}
                            </span>

                            {parentZone && (
                              <span className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border/20 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground">
                                <Layers className="h-3 w-3 shrink-0" />
                                <span className="break-words">{parentZone.name}</span>
                              </span>
                            )}

                            {pointCount >= 3 ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {pointCount} {isVietnamese ? "điểm ranh giới" : "pts"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                                {isVietnamese ? "Chưa vẽ trên camera" : "Not plotted on camera"}
                              </span>
                            )}
                          </div>

                          {area.description && (
                            <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                              {area.description}
                            </p>
                          )}
                        </div>

                        {canManageAreas && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleToggleAreaStatus(area)}
                              disabled={updateAreaMutation.isPending}
                              title={
                                isAreaActive
                                  ? isVietnamese
                                    ? "Tạm tắt giám sát vùng cấm"
                                    : "Deactivate area"
                                  : isVietnamese
                                    ? "Kích hoạt lại giám sát vùng cấm"
                                    : "Activate area"
                              }
                              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                                isAreaActive
                                  ? "text-danger hover:bg-danger/10"
                                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedArea(area);
                                setAreaDrawerOpen(true);
                              }}
                              title={
                                isVietnamese
                                  ? "Vẽ lại / Sửa ranh giới vùng cấm"
                                  : "Edit danger boundary"
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/70 hover:bg-danger/[0.08] hover:text-danger transition"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                            </button>

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
                              title={isVietnamese ? "Xóa vùng cấm" : "Delete restricted area"}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/70 hover:bg-danger/[0.08] hover:text-danger transition disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Interactive Danger Boundary Canvas Drawer */}
      <RestrictedAreaDrawer
        open={areaDrawerOpen}
        onOpenChange={setAreaDrawerOpen}
        siteId={site.id}
        siteName={site.name}
        area={selectedArea}
        defaultZoneId={filterZoneId || undefined}
      />

      {/* Delete Zone Confirmation Modal */}
      <Modal
        open={Boolean(deleteZoneTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteZoneTarget(null);
            setForceDeleteZone(false);
          }
        }}
        title={isVietnamese ? "Xác nhận xóa phân khu" : "Confirm Delete Zone"}
        description={
          deleteZoneTarget
            ? `${deleteZoneTarget.name} (${deleteZoneTarget.code})`
            : undefined
        }
        icon={<AlertTriangle className="h-5 w-5 text-danger" />}
        preventClose={deleteZoneMutation.isPending}
        size="sm"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteZoneTarget(null)}
              disabled={deleteZoneMutation.isPending}
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={
                deleteZoneMutation.isPending ||
                (deleteZoneLinkedAreasCount > 0 && !forceDeleteZone)
              }
              onClick={() => void handleConfirmDeleteZone()}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5"
            >
              {deleteZoneMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>{isVietnamese ? "Xóa phân khu" : "Delete Zone"}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground break-words">
            {isVietnamese
              ? `Phân khu này đang có ${deleteZoneLinkedCamerasCount} camera và ${deleteZoneLinkedAreasCount} vùng cấm trực thuộc.`
              : `This zone currently contains ${deleteZoneLinkedCamerasCount} cameras and ${deleteZoneLinkedAreasCount} restricted areas.`}
          </p>

          {deleteZoneLinkedAreasCount > 0 && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
              <input
                type="checkbox"
                checked={forceDeleteZone}
                onChange={(e) => setForceDeleteZone(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-danger/40"
              />
              <span className="min-w-0 flex-1 break-words">
                {isVietnamese
                  ? "Xóa ép buộc (gỡ liên kết phân khu khỏi các vùng cấm để các vùng cấm áp dụng cho toàn công trường)."
                  : "Force delete (unassign linked restricted areas to apply site-wide)."}
              </span>
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
