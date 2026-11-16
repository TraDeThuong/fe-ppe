"use client";

import React from "react";
import Link from "next/link";
import { Users, ShieldCheck, Lock, UserCheck, ArrowRight, Shield } from "lucide-react";
import { useUserSummary } from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";
import { AnimatedNumber, useAnimatedProgress } from "@/components/ui/animated-number";
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
  const animatedActivePercent = useAnimatedProgress(activePercent, { enabled: !isLoading });
  const animatedTwoFactorPercent = useAnimatedProgress(twoFactorPercent, { enabled: !isLoading });

  return (
    <div
      className={[
        "relative flex flex-col justify-between overflow-hidden transition-all duration-300",
        // Khung vỏ ngoài Pure Neumorphism: Đồng màu nền gốc, không viền
        "rounded-[24px] sm:rounded-[28px] p-4 sm:p-5",
        "bg-background",
        "shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]",
        className,
      ].join(" ")}
    >
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* Icon Box 2 tầng: Vỏ lồi + Lõi lõm đúc từ màu nền */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
              <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <Users className="size-4" strokeWidth={2.3} />
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-black tracking-tight text-foreground sm:text-base">
                {t("dashboard.usersCard.title")}
              </h3>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {t("dashboard.usersCard.subtitle")}
              </p>
            </div>
          </div>

          {/* Tổng số user: Dạng huy hiệu khắc chìm (Recessed Pill) */}
          <span className="inline-flex shrink-0 items-center rounded-full bg-background px-3 py-1 font-mono text-[11px] font-extrabold tabular-nums text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
            <AnimatedNumber value={total} /> {t("nav.users").toLowerCase()}
          </span>
        </div>

        {/* Khay lõm chứa chỉ số người dùng & bảo mật (Recessed Telemetry Well) */}
        <div className="mt-4 rounded-[18px] bg-background p-3.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
          {isLoading ? (
            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-28 rounded-md" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-28 rounded-md" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
              <Skeleton className="h-10 w-full rounded-[12px]" />
            </div>
          ) : isError ? (
            <div className="flex h-36 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <p className="font-medium">{t("dashboard.data.error")}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-full bg-background px-3 py-1 text-[11px] font-bold text-primary shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
              >
                {t("dashboard.data.retry")}
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Active Users bar */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <span className="flex size-5 items-center justify-center rounded-md bg-background text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
                      <UserCheck className="size-3" strokeWidth={2.4} />
                    </span>
                    <span>{t("dashboard.usersCard.active")}</span>
                  </div>
                  <span className="font-mono text-[11px] font-extrabold tabular-nums text-foreground">
                    <AnimatedNumber value={active} />/<AnimatedNumber value={total} />{" "}
                    <span className="text-primary">(<AnimatedNumber value={activePercent} />%)</span>
                  </span>
                </div>

                {/* Rãnh thanh tiến trình khắc chìm (Recessed Groove Track) */}
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-background p-[2px] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                  <div
                    className="h-full rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.45)] transition-all duration-700 animate-live-shimmer"
                    style={{ width: `${animatedActivePercent}%` }}
                  />
                </div>
              </div>

              {/* 2FA Security bar */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <span className="flex size-5 items-center justify-center rounded-md bg-background text-accent-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
                      <ShieldCheck className="size-3" strokeWidth={2.4} />
                    </span>
                    <span>{t("dashboard.usersCard.twoFactor")}</span>
                  </div>
                  <span className="font-mono text-[11px] font-extrabold tabular-nums text-foreground">
                    <AnimatedNumber value={twoFactor} />/<AnimatedNumber value={total} />{" "}
                    <span className="text-muted-foreground">
                      (<AnimatedNumber value={twoFactorPercent} />%)
                    </span>
                  </span>
                </div>

                {/* Rãnh thanh tiến trình khắc chìm dùng tông Accent */}
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-background p-[2px] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                  <div
                    className="h-full rounded-full bg-accent-foreground/80 transition-all duration-700 animate-live-shimmer"
                    style={{ width: `${animatedTwoFactorPercent}%` }}
                  />
                </div>
              </div>

              {/* Locked Accounts stat: Khối nổi lên bên trong khay lõm */}
              <div className="flex items-center justify-between rounded-[13px] bg-background px-3 py-2 text-xs shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]">
                <div className="flex items-center gap-2">
                  <Lock
                    className={`size-3.5 ${locked > 0 ? "text-danger" : "text-muted-foreground"
                      }`}
                    strokeWidth={2.3}
                  />
                  <span className="font-semibold text-muted-foreground">
                    {t("dashboard.usersCard.locked")}:
                  </span>
                </div>

                <span
                  className={`rounded-full bg-background px-2.5 py-0.5 font-mono text-[11px] font-extrabold tabular-nums shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] ${locked > 0 ? "text-danger" : "text-foreground"
                    }`}
                >
                  <AnimatedNumber value={locked} /> tài khoản
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Hai nút bấm vật lý nổi cân đối, không viền */}
      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link
          href="/roles"
          className="group inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-muted-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
        >
          <Shield className="size-3.5 text-accent-foreground" strokeWidth={2.3} />
          <span>{t("dashboard.usersCard.manageRoles")}</span>
        </Link>

        <Link
          href="/users"
          className="group inline-flex items-center gap-1.5 rounded-full bg-background px-3.5 py-1.5 text-[11px] font-bold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
        >
          <span>{t("dashboard.usersCard.manageUsers")}</span>
          <ArrowRight
            className="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2.4}
          />
        </Link>
      </div>
    </div>
  );
}
