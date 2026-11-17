"use client";

import { AlertTriangle, Power, PowerOff } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLocale } from "@/providers/locale-provider";
import type { CronJobItem } from "@/types/cron.types";

interface Props {
  job: CronJobItem;
  open: boolean;
  pending: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function CronToggleConfirmDialog({
  job,
  open,
  pending,
  onConfirm,
  onClose,
}: Props) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const isDisabling = job.isEnabled;
  const jobTitle = t(`cron.jobs.${job.name}`);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={pending}
      variant={isDisabling ? "warning" : "default"}
      title={isDisabling ? t("cron.confirmDisable") : t("cron.confirmEnable")}
      itemName={jobTitle}
      confirmText={isDisabling ? t("cron.disable") : t("cron.enable")}
      cancelText={t("cron.cancel")}
      icon={
        isDisabling ? (
          <PowerOff className="size-5 text-warning" aria-hidden="true" />
        ) : (
          <Power className="size-5 text-primary" aria-hidden="true" />
        )
      }
    >
      <div className="space-y-3 text-xs sm:text-sm">
        <p className="leading-relaxed text-foreground">
          {isDisabling
            ? t("cron.confirmDisableDesc", { name: jobTitle })
            : t("cron.confirmEnableDesc", { name: jobTitle, cron: job.cron })}
        </p>

        {isDisabling && job.name.startsWith("cleanup-") && (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-warning-foreground dark:text-warning">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              {t("cron.cleanupImpact")}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border/50 bg-muted/40 p-2.5 font-mono text-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>{isVietnamese ? "Mã tác vụ:" : "Job Key:"}</span>
            <span className="font-semibold text-primary">{job.name}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground mt-1">
            <span>{isVietnamese ? "Biểu thức Cron:" : "Cron Expression:"}</span>
            <span className="font-semibold text-foreground">{job.cron}</span>
          </div>
        </div>
      </div>
    </ConfirmDialog>
  );
}

