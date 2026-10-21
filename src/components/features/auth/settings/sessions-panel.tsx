"use client";

import { useState } from "react";
import { Laptop, Loader2, MapPin, ShieldAlert } from "lucide-react";

import { Button } from "@ui/button";

import { useRevokeOtherSessions, useRevokeSession, useSessions } from "@/hooks/auth";
import { useLocale } from "@/providers/locale-provider";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Panel danh sách phiên đăng nhập:
 * - Đánh dấu phiên hiện tại (isCurrent) — không cho thu hồi trực tiếp từ nút riêng.
 * - Thu hồi phiên khác: inline confirm (2 lần bấm).
 * - "Đăng xuất tất cả thiết bị khác" gọi DELETE /auth/sessions.
 */
export function SessionsPanel() {
  const { t } = useLocale();
  const sessions = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  // Id phiên đang chờ xác nhận thu hồi (bấm nút lần 1 → confirm)
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  function handleRevoke(id: string) {
    if (confirmId === id) {
      revokeSession.mutate(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
    }
  }

  function handleRevokeAll() {
    if (confirmRevokeAll) {
      revokeOthers.mutate({});
      setConfirmRevokeAll(false);
    } else {
      setConfirmRevokeAll(true);
    }
  }

  if (sessions.isLoading) {
    return (
      <div
        data-testid="sessions-loading"
        className="flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/20 p-5 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {t("security.sessions.loading")}
      </div>
    );
  }

  if (sessions.isError || !sessions.data?.length) {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 text-sm text-muted-foreground">
        {t("security.sessions.empty")}
      </div>
    );
  }

  return (
    <div data-testid="sessions-panel" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {sessions.data.map((session) => {
          const isCurrent = session.isCurrent;
          const pendingConfirm = confirmId === session.id;
          return (
            <li
              key={session.id}
              data-testid={`session-item${isCurrent ? "-current" : ""}`}
              className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Laptop className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 font-semibold text-foreground">
                    <span className="truncate">{session.deviceName}</span>
                    {isCurrent && (
                      <span
                        data-testid="session-current-badge"
                        className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
                      >
                        {t("security.sessions.current")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3" aria-hidden="true" />
                    {session.ipAddress} · {formatDate(session.createdAt)}
                  </p>
                </div>
              </div>

              {!isCurrent && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={revokeSession.isPending}
                  onClick={() => handleRevoke(session.id)}
                >
                  {revokeSession.isPending && pendingConfirm ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      {t("security.2fa.working")}
                    </span>
                  ) : pendingConfirm ? (
                    t("security.sessions.revokeConfirm")
                  ) : (
                    t("security.sessions.revoke")
                  )}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {sessions.data.some((s) => !s.isCurrent) && (
        <div className="flex flex-col gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="size-4 shrink-0 text-danger" aria-hidden="true" />
            {t("security.sessions.revokeAllOthers")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
            disabled={revokeOthers.isPending}
            onClick={handleRevokeAll}
          >
            {revokeOthers.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                {t("security.2fa.working")}
              </span>
            ) : confirmRevokeAll ? (
              t("security.sessions.revokeConfirm")
            ) : (
              t("security.sessions.revokeAllOthers")
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
