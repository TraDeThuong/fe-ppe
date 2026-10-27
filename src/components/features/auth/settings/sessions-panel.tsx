
"use client";

import { useState } from "react";
import {
  Laptop,
  Loader2,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Clock3,
  MonitorSmartphone,
  Fingerprint,
  ChevronRight,
  Globe2,
  LockKeyhole,
} from "lucide-react";

import { Button } from "@ui/button";
import {
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from "@/hooks/auth";
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

export function SessionsPanel() {
  const { t } = useLocale();
  const sessions = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  function handleRevoke(id: string) {
    if (confirmId === id) {
      revokeSession.mutate(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setConfirmRevokeAll(false);
    }
  }

  function handleRevokeAll() {
    if (confirmRevokeAll) {
      revokeOthers.mutate({});
      setConfirmRevokeAll(false);
    } else {
      setConfirmRevokeAll(true);
      setConfirmId(null);
    }
  }

  if (sessions.isLoading) {
    return (
      <div
        data-testid="sessions-loading"
        className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-2xl border border-border/30 bg-background p-6"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border/30 bg-background">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {t("security.sessions.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (sessions.isError || !sessions.data?.length) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-background p-6 sm:p-8">
        <div className="flex flex-col items-center py-5 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-border/30 bg-background">
            <MonitorSmartphone
              className="size-7 text-muted-foreground"
              strokeWidth={1.6}
            />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {t("security.sessions.empty")}
          </p>
        </div>
      </div>
    );
  }

  const otherSessions = sessions.data.filter((session) => !session.isCurrent);
  const currentSession = sessions.data.find((session) => session.isCurrent);

  return (
    <div data-testid="sessions-panel" className="flex w-full flex-col gap-5">
      {/* Overview */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-border/30 bg-transparent p-5 shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)] sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 -z-10 size-48 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 -z-10 size-40 rounded-full bg-emerald-500/[0.06] blur-3xl" />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-transparent shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
              <Fingerprint className="size-7 text-primary" strokeWidth={1.7} />
              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-emerald-500 text-white shadow-sm">
                <ShieldCheck className="size-3" strokeWidth={2.5} />
              </span>
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                {t("security.sessions.title")}
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                {t("security.sessions.description")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border/30 bg-transparent px-4 py-3 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Globe2 className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Active sessions
              </p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {sessions.data.length.toString().padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-transparent p-3.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-transparent text-emerald-600 shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)] dark:text-emerald-400">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Current device
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {currentSession ? "Protected" : "Not identified"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-transparent p-3.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-transparent text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
              <MonitorSmartphone className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Other devices
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {otherSessions.length.toString().padStart(2, "0")} sessions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Session list */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Devices & sessions
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {sessions.data.length} session
              {sessions.data.length === 1 ? "" : "s"} connected to your account
            </p>
          </div>
          <div className="flex size-9 items-center justify-center rounded-xl border border-border/30 bg-transparent text-muted-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <Laptop className="size-4" />
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {sessions.data.map((session, index) => {
            const isCurrent = session.isCurrent;
            const pendingConfirm = confirmId === session.id;

            return (
              <li
                key={session.id}
                data-testid={`session-item${isCurrent ? "-current" : ""}`}
                className={[
                  "group relative overflow-hidden rounded-2xl border p-4",
                  "transition-all duration-200",
                  "shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]",
                  isCurrent
                    ? "border-emerald-500/30 bg-transparent"
                    : pendingConfirm
                      ? "border-danger/40 bg-transparent"
                      : "border-border/30 bg-transparent hover:border-border/60",
                ].join(" ")}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {isCurrent && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-600" />
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div
                      className={[
                        "relative flex size-12 shrink-0 items-center justify-center rounded-2xl border",
                        "transition-transform duration-200 group-hover:scale-[1.03]",
                        "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                        isCurrent
                          ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-600 dark:text-emerald-400"
                          : "border-border/30 bg-transparent text-muted-foreground",
                      ].join(" ")}
                    >
                      <Laptop className="size-5" strokeWidth={1.8} />
                      {isCurrent && (
                        <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full border-2 border-background bg-emerald-500">
                          <span className="size-1 rounded-full bg-white" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="max-w-full truncate text-sm font-bold text-foreground">
                          {session.deviceName}
                        </p>

                        {isCurrent && (
                          <span
                            data-testid="session-current-badge"
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-700 dark:text-emerald-400"
                          >
                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                            {t("security.sessions.current")}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-col gap-1.5">
                        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0 text-primary/70" />
                          <span className="truncate">{session.ipAddress}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="size-3.5 shrink-0" />
                          <span>{formatDate(session.createdAt)}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <div className="flex shrink-0 items-center justify-end sm:pl-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={[
                          "min-w-28 rounded-xl transition-all duration-200",
                          pendingConfirm
                            ? "border-danger/40 bg-danger/10 font-semibold text-danger hover:bg-danger/15 hover:text-danger"
                            : "border-border/40 bg-background hover:border-danger/30 hover:text-danger",
                        ].join(" ")}
                        disabled={revokeSession.isPending}
                        onClick={() => handleRevoke(session.id)}
                      >
                        {revokeSession.isPending && pendingConfirm ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="size-3.5 animate-spin" />
                            {t("security.2fa.working")}
                          </span>
                        ) : pendingConfirm ? (
                          <>
                            <ShieldAlert className="mr-1.5 size-3.5" />
                            {t("security.sessions.revokeConfirm")}
                          </>
                        ) : (
                          <>
                            {t("security.sessions.revoke")}
                            <ChevronRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {pendingConfirm && !revokeSession.isPending && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-danger/15 bg-danger/[0.045] p-3 text-xs leading-5 text-muted-foreground">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" />
                    <p>
                      Confirm to sign out this device. You may need to sign in
                      again on that device to access your account.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Revoke other sessions */}
      {otherSessions.length > 0 && (
        <section
          className={[
            "relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 sm:p-5",
            "shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]",
            confirmRevokeAll
              ? "border-danger/30 bg-danger/[0.055]"
              : "border-danger/20 bg-transparent",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-danger/[0.06] blur-2xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-danger/20 bg-transparent text-danger shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                {confirmRevokeAll ? (
                  <ShieldAlert className="size-5" />
                ) : (
                  <LockKeyhole className="size-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {confirmRevokeAll
                    ? t("security.sessions.revokeConfirm")
                    : t("security.sessions.revokeAllOthers")}
                </p>
                <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                  {confirmRevokeAll
                    ? "This action will sign out every other device. Your current session will remain active."
                    : "End all other sessions at once while keeping this device signed in."}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={[
                "relative z-10 shrink-0 rounded-xl transition-all duration-200",
                confirmRevokeAll
                  ? "border-danger bg-danger text-white hover:bg-danger/90 hover:text-white"
                  : "border-danger/25 bg-background text-danger hover:border-danger/40 hover:bg-danger/[0.06] hover:text-danger",
              ].join(" ")}
              disabled={revokeOthers.isPending}
              onClick={handleRevokeAll}
            >
              {revokeOthers.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("security.2fa.working")}
                </span>
              ) : confirmRevokeAll ? (
                <>
                  <ShieldAlert className="mr-1.5 size-3.5" />
                  {t("security.sessions.revokeConfirm")}
                </>
              ) : (
                <>
                  <LockKeyhole className="mr-1.5 size-3.5" />
                  {t("security.sessions.revokeAllOthers")}
                </>
              )}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
