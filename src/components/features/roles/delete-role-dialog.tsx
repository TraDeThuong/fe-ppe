"use client";

import { AlertTriangle, Loader2, Lock, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { RoleDto } from "@/types";

export interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleDto | null;
  onConfirm: (id: string, name?: string) => Promise<void>;
  loading?: boolean;
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  role,
  onConfirm,
  loading = false,
}: DeleteRoleDialogProps) {
  const { t } = useLocale();

  const isSystem = role?.isSystem || false;
  const userCount = role?.userCount || 0;

  const handleConfirm = async () => {
    if (!role || isSystem) return;
    await onConfirm(role.id, role.name);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("roles.modals.deleteTitle")}
      description={
        isSystem
          ? t("roles.modals.cannotDeleteSystemDesc")
          : t("roles.modals.deletePrompt")
      }
      icon={
        isSystem ? (
          <Lock className="h-5 w-5 text-amber-500" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-danger" />
        )
      }
      size="sm"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center">
          <p className="font-mono text-sm font-bold text-foreground">
            {role?.name || ""}
          </p>
          {role?.description && (
            <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
          )}
        </div>

        {isSystem ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
            {t("roles.modals.systemRoleLockedWarn")}
          </div>
        ) : userCount > 0 ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            {t("roles.modals.usersAssignedWarn")}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>

          {!isSystem && (
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>{t("roles.modals.confirmDelete")}</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
