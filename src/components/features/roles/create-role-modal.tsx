"use client";

import { useState } from "react";
import { Loader2, Plus, Shield } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { CreateRolePayload } from "@/types";

export interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateRolePayload) => Promise<void>;
  loading?: boolean;
}

export function CreateRoleModal({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CreateRoleModalProps) {
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedName = name.trim().toUpperCase().replace(/\s+/g, "_");
    if (!formattedName) {
      setError("Vui lòng nhập tên/mã định danh vai trò (Role Name).");
      return;
    }

    if (!/^[A-Z0-9_]+$/.test(formattedName)) {
      setError("Tên vai trò chỉ được chứa chữ hoa, số và dấu gạch dưới (VD: SAFETY_AUDITOR).");
      return;
    }

    try {
      await onSubmit({
        name: formattedName,
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo vai trò";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("roles.modals.createTitle")}
      description={t("roles.modals.createDesc")}
      icon={<Shield className="h-5 w-5 text-primary" />}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("roles.modals.nameLabel")} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: SAFETY_AUDITOR, SITE_INSPECTOR..."
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs uppercase tracking-wide shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
            required
          />
          <p className="text-[11px] text-muted-foreground">
            {t("roles.modals.nameHint")}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("roles.modals.descLabel")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả phạm vi trách nhiệm và quyền hạn của vai trò này..."
            rows={3}
            className="w-full resize-none rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>{t("roles.modals.createAction")}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
