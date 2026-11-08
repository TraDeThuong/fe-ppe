"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertOctagon, Camera, Loader2, Save, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { RestrictedAreaCanvas } from "./restricted-area-canvas";
import { useCameras } from "@/hooks/cameras";
import { useSiteZones } from "@/hooks/sites/use-site-zones";
import {
  useCreateRestrictedArea,
  useUpdateRestrictedArea,
} from "@/hooks/sites/use-restricted-areas";
import { useLocale } from "@/providers/locale-provider";
import type { RestrictedAreaItem, RestrictedAreaPoint } from "@/types";

export interface RestrictedAreaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteName?: string;
  area?: RestrictedAreaItem | null;
  defaultZoneId?: string;
}

export function RestrictedAreaDrawer({
  open,
  onOpenChange,
  siteId,
  siteName,
  area,
  defaultZoneId,
}: RestrictedAreaDrawerProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Data queries
  const { data: zones = [] } = useSiteZones(siteId, open && Boolean(siteId));
  const { data: camerasData } = useCameras(
    { siteId, limit: 100 },
    { enabled: open && Boolean(siteId) }
  );
  const cameras = useMemo(() => camerasData?.items ?? [], [camerasData]);

  // Mutations
  const createAreaMutation = useCreateRestrictedArea();
  const updateAreaMutation = useUpdateRestrictedArea();

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM">("CRITICAL");
  const [zoneId, setZoneId] = useState("");
  const [points, setPoints] = useState<RestrictedAreaPoint[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state when opening drawer or selecting area
  useEffect(() => {
    if (!open) {
      setValidationError(null);
      return;
    }

    if (area) {
      setName(area.name || "");
      setDescription(area.description || "");
      setSeverity((area.severity as any) || "CRITICAL");
      setZoneId(area.zoneId || defaultZoneId || "");

      // Parse boundary points if exists
      if (Array.isArray(area.boundary) && area.boundary.length > 0) {
        setPoints(
          area.boundary.map((p: any) => ({
            x: typeof p.x === "number" ? p.x : 0,
            y: typeof p.y === "number" ? p.y : 0,
          }))
        );
      } else {
        setPoints([
          { x: 0.25, y: 0.25 },
          { x: 0.75, y: 0.25 },
          { x: 0.75, y: 0.75 },
          { x: 0.25, y: 0.75 },
        ]);
      }
    } else {
      setName("");
      setDescription("");
      setSeverity("CRITICAL");
      setZoneId(defaultZoneId || "");
      // Default initial preset polygon
      setPoints([
        { x: 0.25, y: 0.25 },
        { x: 0.75, y: 0.25 },
        { x: 0.75, y: 0.75 },
        { x: 0.25, y: 0.75 },
      ]);
    }
  }, [open, area, defaultZoneId]);

  // Set default selected camera once cameras are loaded
  useEffect(() => {
    if (cameras.length > 0 && !selectedCameraId) {
      // Prioritize camera in the same zone if any
      const matchingCam = zoneId ? cameras.find((c) => c.zoneId === zoneId) : cameras[0];
      setSelectedCameraId(matchingCam ? matchingCam.id : cameras[0].id);
    }
  }, [cameras, zoneId, selectedCameraId]);

  // Selected reference camera details
  const activeCamera = useMemo(
    () => cameras.find((c) => c.id === selectedCameraId) || cameras[0] || null,
    [cameras, selectedCameraId]
  );

  const isSaving = createAreaMutation.isPending || updateAreaMutation.isPending;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setValidationError(
        isVietnamese
          ? "Tên vùng cấm phải có ít nhất 2 ký tự."
          : "Area name must be at least 2 characters."
      );
      return;
    }

    if (points.length < 3) {
      setValidationError(
        isVietnamese
          ? "Ranh giới vùng cấm phải có tối thiểu 3 điểm tọa độ để tạo thành đa giác khép kín."
          : "Boundary must have at least 3 points to form a closed polygon."
      );
      return;
    }

    if (points.length > 50) {
      setValidationError(
        isVietnamese
          ? "Đa giác không được vượt quá 50 điểm tọa độ."
          : "Boundary cannot exceed 50 points."
      );
      return;
    }

    try {
      if (area) {
        await updateAreaMutation.mutateAsync({
          siteId,
          areaId: area.id,
          payload: {
            name: trimmedName,
            description: description.trim() || undefined,
            zoneId: zoneId || null,
            boundary: points,
            severity,
          },
        });
      } else {
        await createAreaMutation.mutateAsync({
          siteId,
          payload: {
            name: trimmedName,
            description: description.trim() || undefined,
            zoneId: zoneId || undefined,
            boundary: points,
            severity,
          },
        });
      }
      onOpenChange(false);
    } catch {
      // Error is caught & toasted by mutation hook
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        area
          ? isVietnamese
            ? `Chỉnh sửa ranh giới vùng cấm: ${area.name}`
            : `Edit Danger Boundary: ${area.name}`
          : isVietnamese
          ? "Thiết lập vùng cấm nguy hiểm mới (Restricted Area)"
          : "Create Restricted Area & Danger Boundary"
      }
      description={
        siteName
          ? isVietnamese
            ? `Công trường: ${siteName} • Khoanh vùng đa giác cảnh báo vi phạm an toàn`
            : `Site: ${siteName} • Plot danger polygon for automated PPE safety enforcement`
          : isVietnamese
          ? "Khoanh vùng đa giác cảnh báo vi phạm an toàn trên khung hình camera"
          : "Plot danger polygon on camera perspective for automated safety enforcement"
      }
      icon={<AlertOctagon className="h-5 w-5 text-danger" />}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between sm:justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-danger hover:bg-danger/90 text-white border-danger"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>
              {area
                ? isVietnamese
                  ? "Cập nhật vùng cấm"
                  : "Update Area"
                : isVietnamese
                ? "Lưu vùng cấm mới"
                : "Save Restricted Area"}
            </span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Validation Alert */}
        {validationError && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Basic Metadata Row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Area Name */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <span>{isVietnamese ? "Tên vùng cấm nguy hiểm" : "Area Name"}</span>
              <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Ví dụ: Miệng hố đào móng Tầng hầm B1, Chân cẩu tháp số 2"
                  : "e.g.: Excavation Shaft B1, Tower Crane #2 Base"
              }
              className="h-9 w-full rounded-xl border border-border/40 bg-surface px-3 text-xs text-foreground shadow-nm-inset focus:border-danger focus:outline-none"
              required
            />
          </div>

          {/* Severity */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-foreground">
              {isVietnamese ? "Mức độ rủi ro" : "Severity"}
            </label>
            <select
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as "CRITICAL" | "HIGH" | "MEDIUM")
              }
              className="h-9 w-full rounded-xl border border-border/40 bg-surface px-3 text-xs text-foreground shadow-nm-inset focus:border-danger focus:outline-none"
            >
              <option value="CRITICAL">
                {isVietnamese ? "NGUY CẤP (CRITICAL)" : "CRITICAL"}
              </option>
              <option value="HIGH">
                {isVietnamese ? "NGUY HIỂM CAO (HIGH)" : "HIGH"}
              </option>
              <option value="MEDIUM">
                {isVietnamese ? "TRUNG BÌNH (MEDIUM)" : "MEDIUM"}
              </option>
            </select>
          </div>
        </div>

        {/* Association Row: Zone & Reference Camera */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Zone Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-foreground">
              {isVietnamese ? "Phân khu trực thuộc (Tùy chọn)" : "Assigned Zone (Optional)"}
            </label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="h-9 w-full rounded-xl border border-border/40 bg-surface px-3 text-xs text-foreground shadow-nm-inset focus:border-danger focus:outline-none"
            >
              <option value="">
                {isVietnamese
                  ? "Toàn bộ công trường (Mọi camera trong Site)"
                  : "Entire Site (All cameras)"}
              </option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.code})
                </option>
              ))}
            </select>
          </div>

          {/* Reference Camera Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Camera className="h-3 w-3 text-primary" />
                <span>{isVietnamese ? "Camera góc quay tham chiếu" : "Reference Camera Stream"}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                {cameras.length} {isVietnamese ? "camera khả dụng" : "cameras available"}
              </span>
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="h-9 w-full rounded-xl border border-primary/30 bg-surface px-3 text-xs font-semibold text-primary shadow-nm-inset focus:border-danger focus:outline-none"
            >
              {cameras.length === 0 ? (
                <option value="">
                  {isVietnamese ? "Chưa có camera (Dùng ảnh mẫu công trường)" : "No camera (Use reference image)"}
                </option>
              ) : (
                cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) - {c.status}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-foreground">
            {isVietnamese ? "Mô tả mối nguy hiểm / Quy tắc xử lý" : "Hazard Description / Protocols"}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isVietnamese
                ? "Ví dụ: Khu vực hố móng có nguy cơ sập lở / rơi ngã cao; nghiêm cấm tiếp cận khi chưa có dây an toàn"
                : "e.g.: Excavation pit with fall hazard; unauthorized entry strictly prohibited"
            }
            className="h-8 w-full rounded-xl border border-border/40 bg-surface px-3 text-xs text-foreground shadow-nm-inset focus:border-danger focus:outline-none"
          />
        </div>

        {/* Interactive Danger Canvas */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <span className="h-3.5 w-1 rounded-full bg-danger" />
              <span>{isVietnamese ? "Vẽ đa giác ranh giới nguy hiểm" : "Draw Danger Boundary Polygon"}</span>
            </label>
            <span className="text-[11px] font-mono font-bold text-danger">
              {points.length} {isVietnamese ? "điểm đã chọn" : "points plotted"}
            </span>
          </div>

          <RestrictedAreaCanvas
            points={points}
            onChange={setPoints}
            streamUrl={activeCamera?.streamUrl}
            imageUrl={activeCamera?.snapshotUrl}
            cameraName={activeCamera ? `${activeCamera.name} (${activeCamera.code})` : undefined}
            disabled={isSaving}
          />
        </div>
      </form>
    </Modal>
  );
}
