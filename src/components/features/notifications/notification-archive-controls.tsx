"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RecessedDialog } from "@/components/ui/modal";
import { useNotificationArchiveActions } from "@/hooks/notifications/use-notification-archive";
import { useNotifications } from "@/hooks/notifications/use-notifications";
import { NotificationArchiveInboxUnavailable } from "@/lib/notification-archive";
import { isNotificationRead } from "@/lib/notification-inbox";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto } from "@/types";
import { NotificationDetailPanel } from "./notification-detail-panel";
import { NotificationList } from "./notification-list";
import { NotificationSkeleton } from "./notification-skeleton";

function archiveErrorKey(error: unknown) {
  return error instanceof NotificationArchiveInboxUnavailable
    ? "notifications.archive.inboxError"
    : "notifications.archive.storageError";
}

export function NotificationArchiveButton({ items, inboxReady }: {
  items: readonly NotificationItemDto[] | undefined;
  inboxReady: boolean;
}) {
  const { t, number } = useLocale();
  const { move } = useNotificationArchiveActions();
  const [confirmedIds, setConfirmedIds] = useState<ReadonlySet<string> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string>();
  const readIds = useMemo(() => new Set(items?.filter((item) =>
    isNotificationRead(item) && !item.unreadIds?.length).map((item) => item.id)), [items]);
  const ready = inboxReady && !submitting;

  const handleConfirm = async () => {
    if (!confirmedIds || submitting) return;
    setSubmitting(true);
    setErrorKey(undefined);
    try {
      const count = await move({ type: "manual", ids: confirmedIds });
      setConfirmedIds(null);
      toast.success(t("notifications.archive.done", { count: number.format(count) }));
    } catch (error) {
      setErrorKey(archiveErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!ready || readIds.size === 0}
        onClick={() => { setConfirmedIds(readIds); setErrorKey(undefined); }}
        className="gap-1.5 border-border/40 text-xs font-semibold"
      >
        <Archive className="size-3.5 text-primary" aria-hidden="true" />
        {t("notifications.archive.cleanRead")}
      </Button>
      <ConfirmDialog
        open={confirmedIds !== null}
        onClose={() => setConfirmedIds(null)}
        onConfirm={handleConfirm}
        variant="default"
        icon={<Archive className="size-5" aria-hidden="true" />}
        title={t("notifications.archive.cleanRead")}
        description={t("notifications.archive.confirm", { count: number.format(confirmedIds?.size ?? 0) })}
        confirmText={t("notifications.archive.move")}
        disabled={!ready}
      >
        {errorKey && <p role="alert" className="text-sm text-danger">{t(errorKey)}</p>}
        {!inboxReady && <p role="status" className="text-sm text-muted-foreground">{t("notifications.archive.inboxError")}</p>}
      </ConfirmDialog>
    </>
  );
}

export function NotificationArchiveTab() {
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [errorKey, setErrorKey] = useState<string>();
  const params = useMemo(() => ({ page, limit }), [page, limit]);
  const query = useNotifications(params, { visibility: "archived" });
  const { move } = useNotificationArchiveActions();
  const selected = query.data?.data.find((item) => item.id === selectedId);
  const currentPage = query.data?.meta.page;
  const showList = !query.isLoading && Boolean(query.error || query.data?.meta.total);
  const showEmpty = query.isSuccess && query.data?.meta.total === 0;

  useEffect(() => {
    if (currentPage !== undefined && currentPage !== page) setPage(currentPage);
  }, [currentPage, page]);

  const restore = async () => {
    if (!selected || restoring) return;
    setRestoring(true);
    setErrorKey(undefined);
    try {
      const count = await move({ type: "restore", id: selected.id });
      setSelectedId(null);
      if (count) toast.success(t("notifications.archive.restored"));
    } catch (error) {
      setErrorKey(archiveErrorKey(error));
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
      {showList && (
        <NotificationList
          items={query.data?.data ?? []} {...query.data?.meta} error={query.error}
          onRetry={() => void query.refetch()}
          onPageChange={setPage} onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }}
          onSelect={(item) => { setSelectedId(item.id); setErrorKey(undefined); }}
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
        {errorKey && <p role="alert" className="text-sm text-danger">{t(errorKey)}</p>}
        {selected && <NotificationDetailPanel notification={selected} />}
      </RecessedDialog>
    </section>
  );
}
