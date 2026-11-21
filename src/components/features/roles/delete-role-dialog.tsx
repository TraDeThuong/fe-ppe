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
      preventClose={loading}
      size="sm"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t("common.cancel")}
          </Button>

          {!isSystem && (
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
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
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center">
          <p className="font-mono text-sm font-bold text-foreground break-words [overflow-wrap:anywhere]">
            {role?.name || ""}
          </p>
          {role?.description && (
            <p className="mt-1 text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">
              {role.description}
            </p>
          )}
        </div>

        {isSystem ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-500">
            {t("roles.modals.systemRoleLockedWarn")}
          </div>
        ) : userCount > 0 ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
            {t("roles.modals.usersAssignedWarn")}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
