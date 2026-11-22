"use client";

import { useEffect, useState } from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useLocale } from "@/providers/locale-provider";
import type { CreateReportTemplateDto } from "@/types";

export interface CreateReportTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSubmit: (dto: CreateReportTemplateDto) => Promise<unknown>;
}

const FILE_TYPE_OPTIONS: SelectOption[] = [
  { value: "PDF", label: "PDF" },
  { value: "EXCEL", label: "EXCEL (.xlsx)" },
  { value: "CSV", label: "CSV" },
  { value: "JSON", label: "JSON" },
];

export function CreateReportTemplateModal({
  open,
  onOpenChange,
  loading = false,
  onSubmit,
}: CreateReportTemplateModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [fileType, setFileType] = useState("PDF");
  const [version, setVersion] = useState("1.0.0");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setCode("");
      setFileType("PDF");
      setVersion("1.0.0");
      setDescription("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim(),
        fileType,
        version: version.trim() || "1.0.0",
        description: description.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      // Lỗi đã được xử lý và hiển thị bởi mutation toast
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isVi ? "Tạo Mẫu Báo cáo mới" : "Create Report Template"}
      description="POST /api/v1/reports/templates"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Tên mẫu *" : "Template Name *"}
            </label>
            <Input
              required
              minLength={2}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isVi ? "Báo cáo Tuân thủ Tuần" : "Weekly Compliance"}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Mã mẫu (code) *" : "Code *"}
            </label>
            <Input
              required
              minLength={2}
              maxLength={50}
              pattern="^[a-zA-Z0-9._-]+$"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="weekly-compliance-pdf"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">File Type</label>
            <Select
              size="sm"
              options={FILE_TYPE_OPTIONS}
              value={fileType}
              onValueChange={setFileType}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Version (SemVer)
            </label>
            <Input
              required
              pattern="^v?\d+\.\d+\.\d+$"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Mô tả" : "Description"}
          </label>
          <Textarea
            rows={3}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isVi ? "Hủy" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="gap-1.5">
            <FilePlus2 className="h-4 w-4" />
            <span>{isVi ? "Tạo mẫu" : "Create Template"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

