"use client";

import { useMemo, useState } from "react";
import { ShieldPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useCameras } from "@/hooks/cameras";
import { useSites } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import type { CreateIncidentPayload } from "@/types";

export interface CreateIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSiteId?: string;
  loading?: boolean;
  onSubmit: (payload: CreateIncidentPayload) => Promise<void>;
}

export function CreateIncidentModal({
  open,
  onOpenChange,
  defaultSiteId = "",
  loading = false,
  onSubmit,
}: CreateIncidentModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const [siteId, setSiteId] = useState(defaultSiteId);
  const [cameraId, setCameraId] = useState("");
  const [violationType, setViolationType] = useState("NO_HELMET");
  const [severity, setSeverity] = useState("HIGH");
  const [detectedAt, setDetectedAt] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [description, setDescription] = useState("");

  const { data: sitesData } = useSites({ limit: 100 });
  const { data: camerasData } = useCameras({
    siteId: siteId || undefined,
    limit: 100,
  });

  const sites = sitesData?.items ?? [];
  const cameras = camerasData?.items ?? [];

  const siteOptions: SelectOption[] = useMemo(
    () => sites.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` })),
    [sites],
  );

  const cameraOptions: SelectOption[] = useMemo(
    () => cameras.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
    [cameras],
  );

  const violationOptions: SelectOption[] = [
    { value: "NO_HELMET", label: isVi ? "Không đội mũ (NO_HELMET)" : "No Helmet" },
    { value: "NO_VEST", label: isVi ? "Không áo phản quang (NO_VEST)" : "No Safety Vest" },
    { value: "RESTRICTED_AREA", label: isVi ? "Vào vùng cấm (RESTRICTED_AREA)" : "Restricted Area" },
    { value: "MULTI_VIOLATION", label: isVi ? "Đa vi phạm (MULTI_VIOLATION)" : "Multiple Violations" },
  ];

  const severityOptions: SelectOption[] = [
    { value: "LOW", label: "LOW" },
    { value: "MEDIUM", label: "MEDIUM" },
    { value: "HIGH", label: "HIGH" },
    { value: "CRITICAL", label: "CRITICAL" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !cameraId) return;
    await onSubmit({
      siteId,
      cameraId,
      violationType,
      severity,
      detectedAt: new Date(detectedAt).toISOString(),
      description: description.trim() || undefined,
    });
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isVi ? "Ghi nhận Sự cố Thủ công" : "Report Manual Incident"}
      description={
        isVi
          ? "Tạo mới hồ sơ vi phạm an toàn lao động ngoài luồng AI tự động."
          : "Manually record a PPE safety incident into the workflow."
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Công trường *" : "Site *"}
            </label>
            <Select
              size="sm"
              options={siteOptions}
              value={siteId}
              onValueChange={(val) => {
                setSiteId(val);
                setCameraId("");
              }}
              placeholder={isVi ? "Chọn công trường" : "Select site"}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Camera *
            </label>
            <Select
              size="sm"
              options={cameraOptions}
              value={cameraId}
              onValueChange={setCameraId}
              placeholder={isVi ? "Chọn camera" : "Select camera"}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Loại vi phạm *" : "Violation Type *"}
            </label>
            <Select
              size="sm"
              options={violationOptions}
              value={violationType}
              onValueChange={setViolationType}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Mức độ *" : "Severity *"}
            </label>
            <Select
              size="sm"
              options={severityOptions}
              value={severity}
              onValueChange={setSeverity}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Thời điểm phát hiện *" : "Detected At *"}
            </label>
            <Input
              type="datetime-local"
              required
              value={detectedAt}
              onChange={(e) => setDetectedAt(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Mô tả chi tiết hiện trường" : "Incident Description"}
          </label>
          <Textarea
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isVi
                ? "Ghi chú vị trí, người vi phạm hoặc bối cảnh..."
                : "Describe location, context, or observations..."
            }
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isVi ? "Hủy" : "Cancel"}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !siteId || !cameraId}
            className="gap-1.5"
          >
            <ShieldPlus className="h-4 w-4" />
            <span>{isVi ? "Tạo sự cố" : "Create Incident"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

