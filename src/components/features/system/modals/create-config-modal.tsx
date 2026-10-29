"use client";

import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { CreateSystemConfigPayload, SystemConfigCategory } from "@/types";

export interface CreateConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateSystemConfigPayload) => Promise<void>;
  loading?: boolean;
}

export function CreateConfigModal({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CreateConfigModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [key, setKey] = useState("");
  const [category, setCategory] = useState<SystemConfigCategory>("GENERAL");
  const [valueType, setValueType] = useState<"string" | "number" | "boolean" | "json">("string");
  const [valueStr, setValueStr] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!key.trim()) {
      setError(isVietnamese ? "Vui lòng nhập khóa cấu hình (Key)." : "Please enter config key.");
      return;
    }

    let parsedValue: unknown = valueStr;
    if (valueType === "boolean") {
      parsedValue = valueStr === "true";
    } else if (valueType === "number") {
      const num = Number(valueStr);
      if (isNaN(num)) {
        setError(isVietnamese ? "Giá trị phải là một con số hợp lệ." : "Value must be a valid number.");
        return;
      }
      parsedValue = num;
    } else if (valueType === "json") {
      try {
        parsedValue = JSON.parse(valueStr);
      } catch {
        setError(
          isVietnamese
            ? "Cú pháp JSON không hợp lệ. Vui lòng kiểm tra lại dấu ngoặc và dấu nháy."
            : "Invalid JSON syntax. Please check quotes and brackets."
        );
        return;
      }
    }

    try {
      await onSubmit({
        key: key.trim(),
        category,
        value: parsedValue,
        description: description.trim() || undefined,
        isPublic,
      });
      onOpenChange(false);
      setKey("");
      setValueStr("");
      setDescription("");
      setIsPublic(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isVietnamese
          ? "Không thể tạo cấu hình lúc này."
          : "Failed to create configuration.";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("system.modals.createTitle")}
      description={
        isVietnamese
          ? "Thêm mới một biến tham số vận hành cho hệ thống microservices."
          : "Add a new operational parameter for the microservices system."
      }
      icon={<Settings className="h-5 w-5 text-primary" />}
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("system.modals.cancel")}
          </Button>

          <Button form="create-config-form" type="submit" variant="primary" disabled={loading}>
            <Plus className="mr-1.5 h-4 w-4" />
            <span>{loading ? t("system.modals.saving") : t("system.modals.save")}</span>
          </Button>
        </div>
      }
    >
      <form id="create-config-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            {t("system.modals.keyLabel")} *
          </label>
          <input
            type="text"
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={isVietnamese ? "ví dụ: app.maintenance_mode" : "e.g.: app.maintenance_mode"}
            className="w-full rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t("system.modals.categoryLabel")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SystemConfigCategory)}
              className="w-full rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
            >
              <option value="GENERAL">GENERAL</option>
              <option value="SECURITY">SECURITY</option>
              <option value="INTEGRATION">INTEGRATION</option>
              <option value="FEATURE_FLAG">FEATURE_FLAG</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {isVietnamese ? "Kiểu dữ liệu (Type)" : "Data Type"}
            </label>
            <select
              value={valueType}
              onChange={(e) =>
                setValueType(e.target.value as "string" | "number" | "boolean" | "json")
              }
              className="w-full rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="json">JSON Object</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            {t("system.modals.valueLabel")} *
          </label>
          {valueType === "boolean" ? (
            <select
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <textarea
              required
              rows={valueType === "json" ? 4 : 2}
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              placeholder={valueType === "json" ? '{\n  "enabled": true\n}' : (isVietnamese ? "Nhập giá trị..." : "Enter value...")}
              className="w-full font-mono rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            {t("system.modals.descLabel")}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isVietnamese ? "Mô tả mục đích cấu hình..." : "Describe config purpose..."}
            className="w-full rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="create-isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="create-isPublic" className="text-xs text-foreground cursor-pointer">
            {t("system.modals.publicLabel")}
          </label>
        </div>
      </form>
    </Modal>
  );
}
