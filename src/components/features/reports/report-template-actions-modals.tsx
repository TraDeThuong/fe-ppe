"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePlus2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useReportTemplates } from "@/hooks/reporting";
import {
  generateUniqueEntityCode,
  isCodeTaken,
  sanitizeManualCode,
} from "@/lib/code-generator";
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
  const { data: existingTemplates = [] } = useReportTemplates();
  const existingTemplateCodes = useMemo(
    () => existingTemplates.map((tpl) => tpl.code),
    [existingTemplates],
  );

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isCodeManual, setIsCodeManual] = useState(false);
  const [fileType, setFileType] = useState("PDF");
  const [version, setVersion] = useState("1.0.0");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setCode("");
      setIsCodeManual(false);
      setFileType("PDF");
      setVersion("1.0.0");
      setDescription("");
      setFormError(null);
      return;
    }
    setCode((prev) => {
      if (prev.trim() && !isCodeTaken(prev, existingTemplateCodes)) return prev;
      return generateUniqueEntityCode({
        prefix: "RPT",
        extraHint: fileType,
        nameHint: name,
        existingCodes: existingTemplateCodes,
        lowercase: true,
      });
    });
  }, [open, existingTemplateCodes]);

  const handleRandomizeCode = () => {
    const nextCode = generateUniqueEntityCode({
      prefix: "RPT",
      extraHint: fileType,
      nameHint: name,
      existingCodes: [...existingTemplateCodes, code],
      lowercase: true,
    });
    setCode(nextCode);
    setIsCodeManual(false);
    setFormError(null);
  };

  const isDuplicateCode = useMemo(
    () => Boolean(code.trim()) && isCodeTaken(code, existingTemplateCodes),
    [code, existingTemplateCodes],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedManual = sanitizeManualCode(code, "dotted");
    const finalCode =
      sanitizedManual.length >= 2
        ? sanitizedManual
        : generateUniqueEntityCode({
            prefix: "RPT",
            extraHint: fileType,
            nameHint: name,
            existingCodes: existingTemplateCodes,
            lowercase: true,
          });

    if (isCodeTaken(finalCode, existingTemplateCodes)) {
      setFormError(
        isVi
          ? `Mã mẫu báo cáo "${finalCode}" đã tồn tại. Vui lòng nhập mã khác hoặc bấm Random mã.`
          : `Template code "${finalCode}" already exists. Please enter another code or click Randomize.`,
      );
      return;
    }

    setFormError(null);
    try {
      await onSubmit({
        name: name.trim(),
        code: finalCode,
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
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-medium text-danger"
          >
            {formError}
          </div>
        )}

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
              onChange={(e) => {
                const nextName = e.target.value;
                setName(nextName);
                if (!isCodeManual) {
                  setCode(
                    generateUniqueEntityCode({
                      prefix: "RPT",
                      extraHint: fileType,
                      nameHint: nextName,
                      existingCodes: existingTemplateCodes,
                      lowercase: true,
                    }),
                  );
                }
                if (formError) setFormError(null);
              }}
              placeholder={isVi ? "Báo cáo Tuân thủ Tuần" : "Weekly Compliance"}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-foreground">
                {isVi ? "Mã mẫu (code)" : "Code"}
              </label>
              <button
                type="button"
                onClick={handleRandomizeCode}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition disabled:opacity-50"
                title={
                  isVi
                    ? "Tự động tạo mã mẫu báo cáo ngẫu nhiên không trùng"
                    : "Generate a unique random report template code"
                }
              >
                <RefreshCw className="h-3 w-3" />
                <span>{isVi ? "Random mã" : "Randomize"}</span>
              </button>
            </div>
            <Input
              maxLength={50}
              value={code}
              error={isDuplicateCode}
              onChange={(e) => {
                const nextVal = e.target.value;
                setCode(nextVal);
                setIsCodeManual(Boolean(nextVal.trim()));
                if (formError) setFormError(null);
              }}
              placeholder={
                isVi
                  ? "Tự động sinh nếu bỏ trống (VD: rpt-pdf-8m2k)"
                  : "Auto-generated if blank (e.g., rpt-pdf-8m2k)"
              }
            />
            {isDuplicateCode && (
              <p className="text-[11px] font-medium text-danger">
                {isVi
                  ? "Mã này đã tồn tại. Bấm 'Random mã' để đổi mã mới."
                  : "This code already exists. Click 'Randomize' to generate a unique code."}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">File Type</label>
            <Select
              size="sm"
              options={FILE_TYPE_OPTIONS}
              value={fileType}
              onValueChange={(nextType) => {
                setFileType(nextType);
                if (!isCodeManual) {
                  setCode(
                    generateUniqueEntityCode({
                      prefix: "RPT",
                      extraHint: nextType,
                      nameHint: name,
                      existingCodes: existingTemplateCodes,
                      lowercase: true,
                    }),
                  );
                }
              }}
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

