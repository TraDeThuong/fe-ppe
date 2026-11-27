"use client";

import { useState } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RecessedDialog } from "@/components/ui/modal";
import { useNotificationArchiveActions } from "@/hooks/notifications/use-notification-archive";
import type { useNotifications } from "@/hooks/notifications/use-notifications";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { NotificationDetailPanel } from "./notification-detail-panel";
import { NotificationList } from "./notification-list";
import { NotificationSkeleton } from "./notification-skeleton";

export function NotificationArchiveButton() {
  const { t, number } = useLocale();
  const { move } = useNotificationArchiveActions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleConfirm = async () => {
    setHasError(false);
    try {
      const count = await move({ type: "manual" });
      setConfirmOpen(false);
      toast.success(t("notifications.archive.done", { count: number.format(count) }));
    } catch {
      setHasError(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setConfirmOpen(true); setHasError(false); }}
        className="gap-1.5 border-border/40 text-xs font-semibold"
      >
        <Archive className="size-3.5 text-primary" aria-hidden="true" />
        {t("notifications.archive.cleanRead")}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        variant="default"
        icon={<Archive className="size-5" aria-hidden="true" />}
        title={t("notifications.archive.cleanRead")}
        description={t("notifications.archive.confirm")}
        confirmText={t("notifications.archive.move")}
      >
        {hasError && <p role="alert" className="text-sm text-danger">{t("notifications.archive.storageError")}</p>}
      </ConfirmDialog>
    </>
  );
}

export function NotificationArchiveTab({ query, onPageChange, onLimitChange, hasActiveFilters, onResetFilters }: {
  query: ReturnType<typeof useNotifications>;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}) {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { move } = useNotificationArchiveActions();
  const selected = query.data?.data.find((item) => item.id === selectedId);
  const showEmpty = !hasActiveFilters && query.isSuccess && query.data.meta.total === 0;

  const restore = async () => {
    if (!selected || restoring) return;
    setRestoring(true);
    setHasError(false);
    try {
      const count = await move({ type: "restore", id: selected.id });
      setSelectedId(null);
      if (count) toast.success(t("notifications.archive.restored"));
    } catch {
      setHasError(true);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <section className="space-y-4" aria-label={t("notifications.tabs.archive")}>
      <p className="text-sm text-muted-foreground">{t("notifications.archive.localDescription")}</p>
      {query.isLoading && <NotificationSkeleton count={4} />}
      {showEmpty && (
        <p className="rounded-2xl border border-border/40 bg-surface p-5 text-sm text-muted-foreground">{t("notifications.archive.empty")}</p>
      )}
      {!query.isLoading && !showEmpty && (
        <NotificationList
          items={query.data?.data ?? []} {...query.data?.meta} error={query.error}
          onRetry={() => void query.refetch()}
          onPageChange={onPageChange} onLimitChange={onLimitChange}
          hasActiveFilters={hasActiveFilters} onResetFilters={onResetFilters}
          onSelect={(item) => { setSelectedId(item.id); setHasError(false); }}
        />
      )}
      <RecessedDialog
        open={Boolean(selected)}
        onOpenChange={(open) => { if (!open) setSelectedId(null); }}
        title={t("notifications.archive.details")}
        size="lg"
        preventClose={restoring}
        footer={(
          <Button disabled={restoring || query.fetchStatus !== "idle" || !query.isSuccess} onClick={() => void restore()}>
            <RotateCcw className="size-4" aria-hidden="true" />{t("notifications.archive.restore")}
          </Button>
        )}
      >
        {hasError && <p role="alert" className="text-sm text-danger">{t("notifications.archive.storageError")}</p>}
        {selected && <NotificationDetailPanel notification={selected} />}
      </RecessedDialog>
    </section>
  );
}
