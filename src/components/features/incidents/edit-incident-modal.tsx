"use client";

import { useEffect, useState } from "react";
import { Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, UpdateIncidentPayload } from "@/types";

export interface EditIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: IncidentItem | null;
  loading?: boolean;
  onSubmit: (id: string, payload: UpdateIncidentPayload) => Promise<void>;
}

export function EditIncidentModal({
  open,
  onOpenChange,
  incident,
  loading = false,
  onSubmit,
}: EditIncidentModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const [violationType, setViolationType] = useState("NO_HELMET");
  const [severity, setSeverity] = useState("HIGH");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (incident) {
      setViolationType(incident.violationType);
      setSeverity(incident.severity);
      setDescription(incident.description || "");
    }
  }, [incident]);

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
    if (!incident) return;
    await onSubmit(incident.id, {
      violationType,
      severity,
      description: description.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isVi ? "Chỉnh sửa Thông tin Sự cố" : "Edit Incident Details"}
      description={incident ? `#${incident.id.slice(0, 8)}` : ""}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Loại vi phạm" : "Violation Type"}
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
              {isVi ? "Mức độ" : "Severity"}
            </label>
            <Select
              size="sm"
              options={severityOptions}
              value={severity}
              onValueChange={setSeverity}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Mô tả sự cố" : "Description"}
          </label>
          <Textarea
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isVi ? "Hủy" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="gap-1.5">
            <Edit3 className="h-4 w-4" />
            <span>{isVi ? "Lưu cập nhật" : "Save Changes"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

