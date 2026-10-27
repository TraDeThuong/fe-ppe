"use client";

import { useEffect, useState } from "react";
import { Edit2, Loader2, Lock, Shield } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { RoleDto, UpdateRolePayload } from "@/types";

export interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleDto | null;
  onSubmit: (id: string, payload: UpdateRolePayload) => Promise<void>;
  loading?: boolean;
}

export function EditRoleModal({
  open,
  onOpenChange,
  role,
  onSubmit,
  loading = false,
}: EditRoleModalProps) {
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || "");
      setError(null);
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setError(null);

    const formattedName = name.trim().toUpperCase().replace(/\s+/g, "_");
    if (!formattedName) {
      setError("Vui lòng nhập tên vai trò.");
      return;
    }

    try {
      await onSubmit(role.id, {
        name: role.isSystem ? undefined : formattedName,
        description: description.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi cập nhật vai trò";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("roles.modals.editTitle")}
      description={t("roles.modals.editDesc")}
      icon={<Edit2 className="h-5 w-5 text-primary" />}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("roles.modals.nameLabel")} <span className="text-danger">*</span>
            </label>
            {role?.isSystem && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                <Lock className="h-3 w-3" />
                {t("roles.modals.systemRoleLocked")}
              </span>
            )}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading || role?.isSystem}
            placeholder="VD: SAFETY_AUDITOR"
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs uppercase tracking-wide shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            required
          />
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
              <Shield className="h-4 w-4" />
            )}
            <span>{t("roles.modals.saveAction")}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
