"use client";

import React from "react";
import Link from "next/link";
import { Users, ShieldCheck, Lock, UserCheck, ArrowRight, Shield } from "lucide-react";
import { useUserSummary } from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader } from "@/components/ui/loader";

export interface DashboardUsersOverviewCardProps {
  className?: string;
}

export function DashboardUsersOverviewCard({ className = "" }: DashboardUsersOverviewCardProps) {
  const { t } = useLocale();
  const { data: summary, isLoading, isError, refetch } = useUserSummary();

  const total = summary?.total ?? 0;
  const active = summary?.active ?? 0;
  const twoFactor = summary?.twoFactor ?? 0;
  const locked = summary?.locked ?? 0;

  const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
  const twoFactorPercent = total > 0 ? Math.round((twoFactor / total) * 100) : 0;

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-border/40 bg-surface/90 p-5 shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-background border border-border/40 text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] dark:bg-white/[0.04] dark:border-white/[0.08] dark:shadow-none">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {t("dashboard.usersCard.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.usersCard.subtitle")}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center rounded-full bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground border border-border/40 dark:bg-white/[0.06] dark:border-white/[0.1]">
            {total} {t("nav.users").toLowerCase()}
          </span>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-28 rounded-md" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-28 rounded-md" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          ) : isError ? (
            <div className="flex h-36 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <p>{t("dashboard.data.error")}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-xs font-semibold text-primary underline"
              >
                {t("dashboard.data.retry")}
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Active Users bar */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <UserCheck className="size-3.5 text-muted-foreground" />
                    <span>{t("dashboard.usersCard.active")}</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {active}/{total} ({activePercent}%)
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${activePercent}%` }}
                  />
                </div>
              </div>

              {/* 2FA Security bar */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <ShieldCheck className="size-3.5 text-muted-foreground" />
                    <span>{t("dashboard.usersCard.twoFactor")}</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {twoFactor}/{total} ({twoFactorPercent}%)
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-foreground/75 transition-all duration-500"
                    style={{ width: `${twoFactorPercent}%` }}
                  />
                </div>
              </div>

              {/* Locked Accounts stat */}
              <div className="flex items-center justify-between rounded-xl border border-border/30 bg-background/50 p-2.5 text-xs dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <Lock className="size-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t("dashboard.usersCard.locked")}:
                  </span>
                </div>
                <span
                  className={`font-semibold ${
                    locked > 0 ? "text-danger" : "text-foreground"
                  }`}
                >
                  {locked} tài khoản
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs dark:border-white/[0.08]">
        <Link
          href="/roles"
          className="group inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <Shield className="size-3.5" />
          <span>{t("dashboard.usersCard.manageRoles")}</span>
        </Link>

        <Link
          href="/users"
          className="group inline-flex items-center gap-1 font-semibold text-primary hover:underline dark:text-primary-foreground"
        >
          <span>{t("dashboard.usersCard.manageUsers")}</span>
          <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
