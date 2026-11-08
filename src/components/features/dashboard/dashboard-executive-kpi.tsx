"use client";

import React from "react";
import {
  Shield,
  Cctv,
  Users,
  Server,
  ArrowUpRight,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardTabKey } from "./dashboard-nav-tabs";

export interface DashboardExecutiveKpiProps {
  // Safety
  totalIncidents?: number | null;
  pendingCount?: number | null;
  // Devices
  onlineCameras?: number | null;
  totalCameras?: number | null;
  aiModelVersion?: string | null;
  // Users
  totalUsers?: number | null;
  activeUsers?: number | null;
  twoFactorCount?: number | null;
  // System
  healthyServices?: number | null;
  totalServices?: number | null;
  avgLatencyMs?: number | null;
  systemStatus?: "HEALTHY" | "DEGRADED" | "DOWN";
  // Actions
  onSelectPillar?: (tab: DashboardTabKey) => void;
  className?: string;
}

export function DashboardExecutiveKpi({
  totalIncidents,
  pendingCount,
  onlineCameras,
  totalCameras,
  aiModelVersion,
  totalUsers,
  activeUsers,
  twoFactorCount,
  healthyServices,
  totalServices,
  avgLatencyMs,
  systemStatus = "HEALTHY",
  onSelectPillar,
  className = "",
}: DashboardExecutiveKpiProps) {
  const { t } = useLocale();

  const twoFactorRate =
    typeof twoFactorCount === "number" && typeof totalUsers === "number" && totalUsers > 0
      ? Math.round((twoFactorCount / totalUsers) * 100)
      : null;

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
      aria-label="Executive KPI Overview"
    >
      {/* 1. PILLAR: SAFETY & INCIDENTS */}
      <button
        type="button"
        onClick={() => onSelectPillar?.("safety")}
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-surface/90 p-4 text-left transition-all duration-200
          shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)]
          hover:-translate-y-0.5 hover:border-primary/50
          dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] dark:hover:border-white/20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
        />

        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.executive.pillarSafety")}
              </p>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            {typeof totalIncidents === "number" ? (
              <span className="font-mono text-3xl font-black tracking-tight text-foreground">
                {totalIncidents}
              </span>
            ) : (
              <Skeleton className="my-1 h-8 w-16 rounded-lg" />
            )}
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              sự cố trong kỳ
            </span>
          </div>
        </div>

        <div
          className="mt-3 flex items-center justify-between rounded-xl border border-border/30 bg-background/60 p-2 text-xs
            shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]
            dark:border-white/[0.04] dark:bg-black/20 dark:shadow-none"
        >
          <span className="text-muted-foreground">
            {t("dashboard.executive.pendingReview")}:
          </span>
          <span className="font-mono font-bold text-foreground">
            {typeof pendingCount === "number" ? (
              `${pendingCount} cần duyệt`
            ) : (
              <Skeleton className="h-3.5 w-16 rounded inline-block" />
            )}
          </span>
        </div>
      </button>

      {/* 2. PILLAR: CAMERAS & AI */}
      <button
        type="button"
        onClick={() => onSelectPillar?.("devices")}
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-surface/90 p-4 text-left transition-all duration-200
          shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)]
          hover:-translate-y-0.5 hover:border-primary/50
          dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] dark:hover:border-white/20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
        />

        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cctv className="size-4 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.executive.pillarCameras")}
              </p>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            {typeof onlineCameras === "number" && typeof totalCameras === "number" ? (
              <span className="font-mono text-3xl font-black tracking-tight text-foreground">
                {`${onlineCameras}/${totalCameras}`}
              </span>
            ) : (
              <Skeleton className="my-1 h-8 w-20 rounded-lg" />
            )}
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {t("dashboard.executive.online")}
            </span>
          </div>
        </div>

        <div
          className="mt-3 flex items-center justify-between rounded-xl border border-border/30 bg-background/60 p-2 text-xs
            shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]
            dark:border-white/[0.04] dark:bg-black/20 dark:shadow-none"
        >
          <span className="text-muted-foreground">Mô hình AI:</span>
          <span className="max-w-[140px] truncate font-mono font-bold text-foreground">
            {aiModelVersion || "YOLO11x active"}
          </span>
        </div>
      </button>

      {/* 3. PILLAR: USERS & ACCESS */}
      <button
        type="button"
        onClick={() => onSelectPillar?.("system")}
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-surface/90 p-4 text-left transition-all duration-200
          shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)]
          hover:-translate-y-0.5 hover:border-primary/50
          dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] dark:hover:border-white/20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
        />

        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.executive.pillarUsers")}
              </p>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            {typeof totalUsers === "number" ? (
              <span className="font-mono text-3xl font-black tracking-tight text-foreground">
                {totalUsers}
              </span>
            ) : (
              <Skeleton className="my-1 h-8 w-16 rounded-lg" />
            )}
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              tài khoản
            </span>
          </div>
        </div>

        <div
          className="mt-3 flex items-center justify-between rounded-xl border border-border/30 bg-background/60 p-2 text-xs
            shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]
            dark:border-white/[0.04] dark:bg-black/20 dark:shadow-none"
        >
          <span className="text-muted-foreground">
            {t("dashboard.executive.twoFactorRate")}:
          </span>
          <span className="font-mono font-bold text-foreground">
            {twoFactorRate != null ? (
              `${twoFactorRate}% bảo mật`
            ) : typeof activeUsers === "number" ? (
              `${activeUsers} hoạt động`
            ) : (
              <Skeleton className="h-3.5 w-16 rounded inline-block" />
            )}
          </span>
        </div>
      </button>

      {/* 4. PILLAR: SYSTEM MICROSERVICES */}
      <button
        type="button"
        onClick={() => onSelectPillar?.("system")}
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-surface/90 p-4 text-left transition-all duration-200
          shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)]
          hover:-translate-y-0.5 hover:border-primary/50
          dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] dark:hover:border-white/20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
        />

        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.executive.pillarSystem")}
              </p>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            {typeof healthyServices === "number" && typeof totalServices === "number" ? (
              <span className="font-mono text-3xl font-black tracking-tight text-foreground">
                {`${healthyServices}/${totalServices}`}
              </span>
            ) : (
              <Skeleton className="my-1 h-8 w-20 rounded-lg" />
            )}
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              dịch vụ sẵn sàng
            </span>
          </div>
        </div>

        <div
          className="mt-3 flex items-center justify-between rounded-xl border border-border/30 bg-background/60 p-2 text-xs
            shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]
            dark:border-white/[0.04] dark:bg-black/20 dark:shadow-none"
        >
          <span className="text-muted-foreground">
            {t("dashboard.executive.avgLatency")}:
          </span>
          <span className="font-mono font-bold text-foreground">
            {typeof avgLatencyMs === "number" ? (
              `${Math.round(avgLatencyMs)}ms`
            ) : (
              <Skeleton className="h-3.5 w-12 rounded inline-block" />
            )}
          </span>
        </div>
      </button>
    </div>
  );
}
