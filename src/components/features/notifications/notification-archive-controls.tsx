"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/form/selection-controls/switch";
import { RecessedDialog } from "@/components/ui/modal";
import {
  useNotificationArchiveActions,
  useNotificationArchiveState,
} from "@/hooks/notifications/use-notification-archive";
import { useNotifications } from "@/hooks/notifications/use-notifications";
import {
  isValidRetentionDays,
  NotificationArchiveInboxUnavailable,
  type NotificationArchiveState,
} from "@/lib/notification-archive";
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
  const archive = useNotificationArchiveState();
  const { move } = useNotificationArchiveActions();
  const [confirmedIds, setConfirmedIds] = useState<ReadonlySet<string> | null>(null);
  const [errorKey, setErrorKey] = useState<string>();
  const readIds = useMemo(() => new Set(items?.filter((item) =>
    isNotificationRead(item) && !item.unreadIds?.length).map((item) => item.id)), [items]);
  const ready = inboxReady && archive.isSuccess;

  const handleConfirm = async () => {
    if (!confirmedIds) return;
    setErrorKey(undefined);
    try {
      const count = await move({ type: "manual", ids: confirmedIds });
      setConfirmedIds(null);
      toast.success(t("notifications.archive.done", { count: number.format(count) }));
    } catch (error) {
      setErrorKey(archiveErrorKey(error));
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
      {archive.isError && (
        <p className="basis-full text-xs text-danger" role="alert">
          {t("notifications.archive.storageError")}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void archive.refetch()}>
            {t("notifications.archive.retry")}
          </button>
        </p>
      )}
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
        {!ready && <p role="status" className="text-sm text-muted-foreground">{t("notifications.archive.inboxError")}</p>}
      </ConfirmDialog>
    </>
  );
}

export function NotificationArchiveSettings() {
  const { t } = useLocale();
  const archive = useNotificationArchiveState();

  return (
    <section className="space-y-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
        <Archive className="size-5 text-primary" aria-hidden="true" />
        {t("notifications.archive.autoTitle")}
      </h2>
      {archive.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger">
          {t("notifications.archive.storageError")}
          <Button variant="outline" size="sm" onClick={() => void archive.refetch()}>{t("notifications.archive.retry")}</Button>
        </div>
      )}
      {archive.isLoading && <p role="status" className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {archive.data && (
        <ArchiveSettingsForm key={`${archive.data.enabled}:${archive.data.retentionDays}`} settings={archive.data} />
      )}
    </section>
  );
}

function ArchiveSettingsForm({ settings }: { settings: NotificationArchiveState }) {
  const { t, dateTime } = useLocale();
  const { saveSettings } = useNotificationArchiveActions();
  const switchId = useId();
  const daysId = useId();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [input, setInput] = useState(String(settings.retentionDays));
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string>();
  const days = Number(input);
  const valid = isValidRetentionDays(days);
  const dirty = enabled !== settings.enabled || days !== settings.retentionDays;

  const save = async () => {
    if (!valid || !dirty || saving) return;
    setSaving(true);
    setErrorKey(undefined);
    try {
      await saveSettings(enabled, days);
      toast.success(t("notifications.archive.settingsSaved"));
    } catch (error) {
      setErrorKey(archiveErrorKey(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <p className="text-sm text-muted-foreground">{t("notifications.archive.autoDescription")}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Switch id={switchId} label={t("notifications.archive.enableAuto")} checked={enabled} onCheckedChange={setEnabled} disabled={saving} />
        <div className="flex items-center gap-2">
          <label htmlFor={daysId} className="text-sm font-medium">{t("notifications.archive.ageDays")}</label>
          <input
            id={daysId} type="number" min={1} max={365} step={1} required
            value={input} onChange={(event) => setInput(event.target.value)} disabled={saving}
            aria-invalid={!valid} aria-describedby={!valid ? `${daysId}-error` : undefined}
            className="h-9 w-24 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        <Button type="submit" size="sm" disabled={!valid || !dirty || saving}>{t("common.save")}</Button>
      </div>
      {!valid && <p id={`${daysId}-error`} className="text-sm text-danger">{t("notifications.archive.invalidDays")}</p>}
      {errorKey && <p role="alert" className="text-sm text-danger">{t(errorKey)}</p>}
      <p className="text-sm text-muted-foreground" role="status">
        {settings.lastRunAt === null ? t("notifications.archive.neverChecked") :
          t("notifications.archive.lastCheck", { date: dateTime.format(settings.lastRunAt) })}
      </p>
    </form>
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
  const archive = useNotificationArchiveState();
  const { move } = useNotificationArchiveActions();
  const selected = query.data?.data.find((item) => item.id === selectedId);
  const currentPage = query.data?.meta.page;
  const showList = !query.isLoading && Boolean(query.error || query.data?.meta.total);
  const showEmpty = archive.isSuccess && query.isSuccess && query.data?.meta.total === 0;

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
      {archive.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger">
          {t("notifications.archive.storageError")}
          <Button variant="outline" size="sm" onClick={() => void archive.refetch()}>{t("notifications.archive.retry")}</Button>
        </div>
      )}
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
          <Button disabled={restoring || query.fetchStatus !== "idle" || !query.isSuccess || !archive.isSuccess} onClick={() => void restore()}>
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
