"use client";

import { useState } from "react";
import {
  AlertOctagon,
  Camera,
  Layers,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { t } = useLocale();

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
    <div className="space-y-6">
      {/* 2-column Layout: Zones on Left, Restricted Danger Areas on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── 1. PHÂN KHU THI CÔNG (ZONES) ─────────────────────────────────── */}
        <div className="space-y-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Phân khu thi công (Zones)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Tổng số: {zones.length} khu vực hoạt động
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddZone((v) => !v)}
              className="flex items-center gap-1 rounded-xl text-xs h-7 px-2.5 text-primary border-primary/30 hover:bg-primary/10"
            >
              <Plus className="h-3 w-3" />
              <span>Thêm phân khu</span>
            </Button>
          </div>

          {/* Quick Add Zone Form */}
          {showAddZone && (
            <form
              onSubmit={handleAddZone}
              className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
            >
              <h4 className="text-xs font-bold text-primary">Tạo phân khu mới</h4>
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Tên phân khu (VD: Zone A - Khu móng hầm)"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs shadow-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Mô tả phân khu (tùy chọn)"
                  value={zoneDescription}
                  onChange={(e) => setZoneDescription(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs shadow-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddZone(false)}
                  className="h-7 text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createZoneMutation.isPending}
                  className="h-7 text-xs"
                >
                  {createZoneMutation.isPending ? "Đang lưu..." : "Lưu phân khu"}
                </Button>
              </div>
            </form>
          )}

          {/* Zones List */}
          {zonesLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-elevated/40" />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Chưa có phân khu nào được tạo. Hãy nhấn "Thêm phân khu" để bắt đầu.
            </div>
          ) : (
            <div className="space-y-2.5">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between rounded-xl border border-border/30 bg-surface-elevated/40 p-3 text-xs transition hover:border-primary/40 dark:border-black/40 dark:bg-background/40"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground truncate">
                        {zone.name}
                      </span>
                    </div>
                    {zone.description && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {zone.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                      className="p-1.5 text-muted-foreground hover:text-danger rounded-lg transition"
                      title="Xóa phân khu"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 2. VÙNG CẤM NGUY HIỂM CAO (RESTRICTED DANGER AREAS) ─────────────── */}
        <div className="space-y-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <AlertOctagon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Vùng cấm nguy hiểm cao (Restricted Areas)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Tổng số: {restrictedAreas.length} vùng kiểm soát nghiêm ngặt
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddArea((v) => !v)}
              className="flex items-center gap-1 rounded-xl text-xs h-7 px-2.5 text-accent border-accent/30 hover:bg-accent/10"
            >
              <Plus className="h-3 w-3" />
              <span>Thêm vùng cấm</span>
            </Button>
          </div>

          {/* Quick Add Area Form */}
          {showAddArea && (
            <form
              onSubmit={handleAddArea}
              className="space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-3"
            >
              <h4 className="text-xs font-bold text-accent">Thiết lập vùng cấm mới</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Tên vùng cấm (VD: Miệng hố thang máy tầng 15)"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs shadow-sm focus:border-accent focus:outline-none"
                  required
                />

                <select
                  value={areaSeverity}
                  onChange={(e) => setAreaSeverity(e.target.value as "CRITICAL" | "HIGH")}
                  className="w-full rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs shadow-sm focus:border-accent focus:outline-none"
                >
                  <option value="CRITICAL">Mức độ: NGUY CẤP (CRITICAL)</option>
                  <option value="HIGH">Mức độ: NGUY HIỂM CAO (HIGH)</option>
                </select>
              </div>

              {zones.length > 0 && (
                <select
                  value={areaZoneId}
                  onChange={(e) => setAreaZoneId(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs shadow-sm focus:border-accent focus:outline-none"
                >
                  <option value="">Thuộc phân khu (Tùy chọn)</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                placeholder="Mô tả lý do nguy hiểm / quy tắc phản ứng"
                value={areaDescription}
                onChange={(e) => setAreaDescription(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs shadow-sm focus:border-accent focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddArea(false)}
                  className="h-7 text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createAreaMutation.isPending}
                  className="h-7 text-xs"
                >
                  {createAreaMutation.isPending ? "Đang lưu..." : "Lưu vùng cấm"}
                </Button>
              </div>
            </form>
          )}

          {/* Restricted Areas List */}
          {areasLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-elevated/40" />
              ))}
            </div>
          ) : restrictedAreas.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Chưa có vùng cấm nguy hiểm nào. Nhấn "Thêm vùng cấm" để kích hoạt chế độ báo động khẩn cấp AI.
            </div>
          ) : (
            <div className="space-y-2.5">
              {restrictedAreas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between rounded-xl border border-border/30 bg-surface-elevated/40 p-3 text-xs transition hover:border-accent/40 dark:border-black/40 dark:bg-background/40"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground truncate">
                        {area.name}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          area.severity === "CRITICAL"
                            ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                        }`}
                      >
                        {area.severity || "CRITICAL"}
                      </span>
                    </div>
                    {area.description && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {area.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                      className="p-1.5 text-muted-foreground hover:text-danger rounded-lg transition"
                      title="Xóa vùng cấm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
