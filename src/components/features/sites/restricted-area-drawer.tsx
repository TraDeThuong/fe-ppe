"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertOctagon,
  Camera,
  Info,
  Layers,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { RestrictedAreaCanvas } from "./restricted-area-canvas";
import { useSiteZones } from "@/hooks/sites/use-site-zones";
import {
  useCreateRestrictedArea,
  useRestrictedAreas,
  useUpdateRestrictedArea,
} from "@/hooks/sites/use-restricted-areas";
import { useLocale } from "@/providers/locale-provider";
import type {
  RestrictedAreaItem,
  RestrictedAreaPoint,
  RestrictedAreaStatus,
} from "@/types";

/**
 * Tọa độ đa giác placeholder diện tích = 0 dùng khi khởi tạo tên Vùng cấm ở cấp Site
 * (vượt qua kiểm tra >= 3 điểm của Backend mà không cần vẽ trước khi có Camera).
 */
export const UNPLOTTED_BOUNDARY_PLACEHOLDER: RestrictedAreaPoint[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/**
 * Trích xuất danh sách điểm đa giác đã được vẽ thực tế trên Camera.
 * Trả về mảng rỗng `[]` nếu boundary chưa có hoặc chỉ là placeholder (0,0).
 */
export function extractPlottedBoundaryPoints(
  boundary: unknown,
): RestrictedAreaPoint[] {
  if (!Array.isArray(boundary) || boundary.length < 3) return [];
  const pts: RestrictedAreaPoint[] = [];
  for (const item of boundary) {
    if (item && typeof item === "object" && "x" in item && "y" in item) {
      const x = Number((item as { x: unknown }).x);
      const y = Number((item as { y: unknown }).y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        pts.push({ x, y });
      }
    }
  }
  if (pts.length < 3) return [];
  const hasNonZeroPoint = pts.some((p) => p.x > 0.0001 || p.y > 0.0001);
  return hasNonZeroPoint ? pts : [];
}

export function isUnplottedBoundary(boundary: unknown): boolean {
  return extractPlottedBoundaryPoints(boundary).length < 3;
}

export interface FixedCameraContext {
  id: string;
  name: string;
  code: string;
  zoneId?: string | null;
  streamUrl?: string | null;
  snapshotUrl?: string | null;
}

export interface RestrictedAreaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteName?: string;
  area?: RestrictedAreaItem | null;
  defaultZoneId?: string;
  /**
   * - "site-metadata": Dùng tại /sites và /sites/[id] — chỉ đặt tên, chọn phân khu, trạng thái, mô tả.
   * - "camera-polygon": Dùng tại /cameras/[id] — chọn vùng cấm của site (hoặc tạo mới) và vẽ đa giác theo góc camera.
   */
  mode?: "site-metadata" | "camera-polygon";
  fixedCamera?: FixedCameraContext | null;
  initialPoints?: RestrictedAreaPoint[] | null;
  onSaveCameraPolygon?: (
    points: RestrictedAreaPoint[],
    savedArea?: RestrictedAreaItem | null,
  ) => Promise<void> | void;
}

const DEFAULT_CAMERA_PRESET_BOX: RestrictedAreaPoint[] = [
  { x: 0.25, y: 0.25 },
  { x: 0.75, y: 0.25 },
  { x: 0.75, y: 0.75 },
  { x: 0.25, y: 0.75 },
];

export function RestrictedAreaDrawer({
  open,
  onOpenChange,
  siteId,
  siteName,
  area,
  defaultZoneId,
  mode = "site-metadata",
  fixedCamera = null,
  initialPoints = null,
  onSaveCameraPolygon,
}: RestrictedAreaDrawerProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const isCameraMode = mode === "camera-polygon";

  // Data queries
  const { data: zones = [] } = useSiteZones(siteId, open && Boolean(siteId));
  const { data: siteAreas = [] } = useRestrictedAreas(
    siteId,
    open && isCameraMode && Boolean(siteId),
  );

  // Mutations
  const createAreaMutation = useCreateRestrictedArea();
  const updateAreaMutation = useUpdateRestrictedArea();

  // In camera-polygon mode, user can pick an existing site RestrictedArea or "NEW"
  const [selectedSiteAreaId, setSelectedSiteAreaId] = useState<string>("NEW");

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<RestrictedAreaStatus>("ACTIVE");
  const [zoneId, setZoneId] = useState("");
  const [points, setPoints] = useState<RestrictedAreaPoint[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isApplyingCamera, setIsApplyingCamera] = useState(false);

  const selectedExistingArea = useMemo(
    () =>
      isCameraMode && selectedSiteAreaId !== "NEW"
        ? siteAreas.find((a) => a.id === selectedSiteAreaId) ?? null
        : area ?? null,
    [area, isCameraMode, selectedSiteAreaId, siteAreas],
  );

  const initSessionRef = useRef<string | null>(null);

  // Initialize form state only when opening modal or switching target area (not on background siteAreas refetch)
  useEffect(() => {
    if (!open) {
      initSessionRef.current = null;
      setValidationError(null);
      return;
    }

    const sessionKey = `${isCameraMode ? "cam" : "site"}:${area?.id ?? "new"}:${fixedCamera?.id ?? ""}:${defaultZoneId ?? ""}`;
    if (initSessionRef.current === sessionKey) {
      return;
    }
    initSessionRef.current = sessionKey;

    if (!isCameraMode) {
      // Site-metadata mode: only name, zoneId, status, description
      if (area) {
        setName(area.name || "");
        setDescription(area.description || "");
        setStatus(area.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
        setZoneId(area.zoneId || defaultZoneId || "");
        setPoints(extractPlottedBoundaryPoints(area.boundary));
      } else {
        setName("");
        setDescription("");
        setStatus("ACTIVE");
        setZoneId(defaultZoneId || "");
        setPoints([]);
      }
      return;
    }

    // Camera-polygon mode: pre-select matching area from site if available
    const cameraZoneId = fixedCamera?.zoneId || defaultZoneId || "";
    const preferredArea =
      area ??
      (cameraZoneId
        ? siteAreas.find((a) => a.zoneId === cameraZoneId)
        : undefined) ??
      siteAreas[0] ??
      null;

    if (preferredArea) {
      setSelectedSiteAreaId(preferredArea.id);
      setName(preferredArea.name || "");
      setDescription(preferredArea.description || "");
      setStatus(preferredArea.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
      setZoneId(preferredArea.zoneId || cameraZoneId);

      const areaPts = extractPlottedBoundaryPoints(preferredArea.boundary);
      const camPts = extractPlottedBoundaryPoints(initialPoints);
      setPoints(
        camPts.length >= 3
          ? camPts
          : areaPts.length >= 3
            ? areaPts
            : DEFAULT_CAMERA_PRESET_BOX,
      );
    } else {
      setSelectedSiteAreaId("NEW");
      setName(
        fixedCamera
          ? isVietnamese
            ? `Vùng cấm ${fixedCamera.name}`
            : `Restricted Area - ${fixedCamera.name}`
          : "",
      );
      setDescription("");
      setStatus("ACTIVE");
      setZoneId(cameraZoneId);
      const camPts = extractPlottedBoundaryPoints(initialPoints);
      setPoints(camPts.length >= 3 ? camPts : DEFAULT_CAMERA_PRESET_BOX);
    }
  }, [
    open,
    isCameraMode,
    area,
    defaultZoneId,
    fixedCamera,
    initialPoints,
    siteAreas,
    isVietnamese,
  ]);

  const handleSelectSiteAreaInCameraMode = (nextAreaId: string) => {
    setSelectedSiteAreaId(nextAreaId);
    setValidationError(null);

    if (nextAreaId === "NEW") {
      setName("");
      setDescription("");
      setStatus("ACTIVE");
      setZoneId(fixedCamera?.zoneId || defaultZoneId || "");
      const camPts = extractPlottedBoundaryPoints(initialPoints);
      setPoints(camPts.length >= 3 ? camPts : DEFAULT_CAMERA_PRESET_BOX);
      return;
    }

    const found = siteAreas.find((a) => a.id === nextAreaId);
    if (found) {
      setName(found.name || "");
      setDescription(found.description || "");
      setStatus(found.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
      setZoneId(found.zoneId || fixedCamera?.zoneId || defaultZoneId || "");
      const areaPts = extractPlottedBoundaryPoints(found.boundary);
      const camPts = extractPlottedBoundaryPoints(initialPoints);
      setPoints(
        areaPts.length >= 3
          ? areaPts
          : camPts.length >= 3
            ? camPts
            : DEFAULT_CAMERA_PRESET_BOX,
      );
    }
  };

  const isSaving =
    createAreaMutation.isPending ||
    updateAreaMutation.isPending ||
    isApplyingCamera;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setValidationError(
        isVietnamese
          ? "Tên vùng cấm phải có ít nhất 2 ký tự."
          : "Area name must be at least 2 characters.",
      );
      return;
    }

    if (isCameraMode) {
      if (points.length < 3) {
        setValidationError(
          isVietnamese
            ? "Ranh giới vùng cấm trên camera phải có tối thiểu 3 điểm tọa độ để tạo thành đa giác khép kín."
            : "Camera danger boundary must have at least 3 points to form a closed polygon.",
        );
        return;
      }

      if (points.length > 50) {
        setValidationError(
          isVietnamese
            ? "Đa giác không được vượt quá 50 điểm tọa độ."
            : "Boundary cannot exceed 50 points.",
        );
        return;
      }
    }

    try {
      setIsApplyingCamera(true);

      // 1. Site-metadata mode: Save name/zone/status/description without requiring polygon plotting
      if (!isCameraMode) {
        const boundaryToKeep =
          area && extractPlottedBoundaryPoints(area.boundary).length >= 3
            ? extractPlottedBoundaryPoints(area.boundary)
            : UNPLOTTED_BOUNDARY_PLACEHOLDER;

        if (area) {
          await updateAreaMutation.mutateAsync({
            siteId,
            areaId: area.id,
            payload: {
              name: trimmedName,
              description: description.trim() || undefined,
              zoneId: zoneId || null,
              boundary: boundaryToKeep,
              status,
            },
          });
        } else {
          await createAreaMutation.mutateAsync({
            siteId,
            payload: {
              name: trimmedName,
              description: description.trim() || undefined,
              zoneId: zoneId || undefined,
              boundary: UNPLOTTED_BOUNDARY_PLACEHOLDER,
              status,
            },
          });
        }
        onOpenChange(false);
        return;
      }

      // 2. Camera-polygon mode: Save plotted polygon to RestrictedArea AND CameraConfig.roiPolygon
      let savedArea: RestrictedAreaItem | null = null;
      if (selectedExistingArea) {
        savedArea = await updateAreaMutation.mutateAsync({
          siteId,
          areaId: selectedExistingArea.id,
          payload: {
            name: trimmedName,
            description: description.trim() || undefined,
            zoneId: zoneId || null,
            boundary: points,
            status,
          },
        });
      } else {
        savedArea = await createAreaMutation.mutateAsync({
          siteId,
          payload: {
            name: trimmedName,
            description: description.trim() || undefined,
            zoneId: zoneId || undefined,
            boundary: points,
            status,
          },
        });
      }

      if (onSaveCameraPolygon) {
        await onSaveCameraPolygon(points, savedArea);
      }

      onOpenChange(false);
    } catch {
      // Error is caught & toasted by mutation hooks
    } finally {
      setIsApplyingCamera(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        isCameraMode
          ? isVietnamese
            ? `Thiết lập Vùng cấm (ROI) theo Góc Camera: ${fixedCamera?.name || ""}`
            : `Configure Camera Restricted Area (ROI): ${fixedCamera?.name || ""}`
          : area
            ? isVietnamese
              ? `Chỉnh sửa vùng cấm: ${area.name}`
              : `Edit Restricted Area: ${area.name}`
            : isVietnamese
              ? "Thêm vùng cấm nguy hiểm mới (Restricted Area)"
              : "Add Restricted Danger Area"
      }
      description={
        isCameraMode
          ? isVietnamese
            ? "Chọn vùng cấm của công trường (hoặc tạo mới) và chấm đa giác ranh giới trực tiếp trên góc nhìn của camera này"
            : "Select a site restricted area (or create new) and plot the danger polygon directly on this camera's perspective"
          : siteName
            ? isVietnamese
              ? `Công trường: ${siteName} • Khai báo danh mục vùng cấm (vẽ ranh giới sau tại từng Camera)`
              : `Site: ${siteName} • Register restricted area metadata (plot boundary per camera later)`
            : isVietnamese
              ? "Khai báo tên và phân khu vùng cấm nguy hiểm của công trường"
              : "Register restricted danger area name and zone for this site"
      }
      icon={<AlertOctagon className="h-5 w-5 text-danger" />}
      size={isCameraMode ? "xl" : "md"}
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
              {isCameraMode
                ? isVietnamese
                  ? "Lưu & Áp dụng cho Camera"
                  : "Save & Apply to Camera"
                : area
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

        {/* Camera Mode: Selector to pick an existing Site RestrictedArea or create a new one */}
        {isCameraMode && (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                <Camera className="h-4 w-4 text-primary" />
                <span>
                  {isVietnamese
                    ? `Góc máy cố định: ${fixedCamera?.name || "Camera"} (${fixedCamera?.code || ""})`
                    : `Bound Camera: ${fixedCamera?.name || "Camera"} (${fixedCamera?.code || ""})`}
                </span>
              </div>
              <span className="rounded-lg bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                {siteAreas.length}{" "}
                {isVietnamese
                  ? "vùng cấm đã khai báo ở Site"
                  : "site areas registered"}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3 text-primary" />
                <span>
                  {isVietnamese
                    ? "Chọn vùng cấm của công trường để vẽ ranh giới (hoặc tạo vùng cấm mới)"
                    : "Select a site restricted area to plot boundary (or create new)"}
                </span>
              </label>
              <select
                value={selectedSiteAreaId}
                onChange={(e) => handleSelectSiteAreaInCameraMode(e.target.value)}
                className="h-9 w-full rounded-xl border border-primary/30 bg-surface px-3 text-xs font-semibold text-foreground shadow-nm-inset focus:border-primary focus:outline-none"
              >
                <option value="NEW">
                  +{" "}
                  {isVietnamese
                    ? "Tạo vùng cấm nguy hiểm mới tại Camera này"
                    : "Create a new restricted area on this camera"}
                </option>
                {siteAreas.map((sa) => {
                  const ptsCount = extractPlottedBoundaryPoints(sa.boundary).length;
                  return (
                    <option key={sa.id} value={sa.id}>
                      {sa.name}{" "}
                      {ptsCount >= 3
                        ? isVietnamese
                          ? `(${ptsCount} điểm đã vẽ)`
                          : `(${ptsCount} pts plotted)`
                        : isVietnamese
                          ? "(Chưa vẽ ranh giới)"
                          : "(Not plotted yet)"}
                    </option>
                  );
                })}
              </select>
            </div>
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

          {/* Status (BE supported: ACTIVE | INACTIVE) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-foreground">
              {isVietnamese ? "Trạng thái giám sát" : "Monitoring Status"}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RestrictedAreaStatus)}
              className="h-9 w-full rounded-xl border border-border/40 bg-surface px-3 text-xs text-foreground shadow-nm-inset focus:border-danger focus:outline-none"
            >
              <option value="ACTIVE">
                {isVietnamese ? "Đang kích hoạt (ACTIVE)" : "ACTIVE"}
              </option>
              <option value="INACTIVE">
                {isVietnamese ? "Tạm tắt (INACTIVE)" : "INACTIVE"}
              </option>
            </select>
          </div>
        </div>

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
                ? "Toàn bộ công trường (Mọi phân khu trong Site)"
                : "Entire Site (All zones)"}
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.code})
              </option>
            ))}
          </select>
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
            className="h-9 w-full rounded-xl border border-border/40 bg-surface px-3 text-xs text-foreground shadow-nm-inset focus:border-danger focus:outline-none"
          />
        </div>

        {/* Site Mode Notice: Explain that polygon plotting happens per-camera in /cameras/[id] */}
        {!isCameraMode ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.06] p-3.5 text-xs text-muted-foreground leading-relaxed">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">
                {isVietnamese
                  ? "Vẽ ranh giới đa giác theo từng góc quay Camera"
                  : "Plot polygon boundary per camera perspective"}
              </p>
              <p className="mt-0.5 text-[11px]">
                {isVietnamese
                  ? "Tại cấp Công trường, bạn chỉ cần đặt tên và phân khu cho vùng cấm. Sau khi tạo Camera cho công trường, hãy vào trang chi tiết Camera (/cameras/[id]) để vẽ vùng cấm trực tiếp trên góc nhìn thực tế của camera đó."
                  : "At the Site level, you only need to register the restricted area name and zone. Once cameras are added, open the Camera Detail page (/cameras/[id]) to plot the danger polygon directly on that camera's video feed."}
              </p>
            </div>
          </div>
        ) : (
          /* Camera Mode: Interactive Danger Canvas on Fixed Camera Stream */
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <span className="h-3.5 w-1 rounded-full bg-danger" />
                <span>
                  {isVietnamese
                    ? "Vẽ đa giác ranh giới nguy hiểm trên khung hình Camera"
                    : "Draw Danger Boundary Polygon on Camera Frame"}
                </span>
              </label>
              <span className="text-[11px] font-mono font-bold text-danger">
                {points.length} {isVietnamese ? "điểm đã chọn" : "points plotted"}
              </span>
            </div>

            <RestrictedAreaCanvas
              points={points}
              onChange={setPoints}
              streamUrl={fixedCamera?.streamUrl || undefined}
              imageUrl={fixedCamera?.snapshotUrl || undefined}
              cameraName={
                fixedCamera ? `${fixedCamera.name} (${fixedCamera.code})` : undefined
              }
              disabled={isSaving}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
