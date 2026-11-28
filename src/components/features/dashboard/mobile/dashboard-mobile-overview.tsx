"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { IncidentMobileList } from "@/components/features/incidents/mobile";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";

interface StatTile {
  key: string;
  label: string;
  value: string;
  href: string;
  tone: "warning" | "primary" | "success" | "muted";
}

const TONE_CLASS: Record<StatTile["tone"], string> = {
  warning: "text-warning",
  primary: "text-primary",
  success: "text-success",
  muted: "text-foreground",
};

export interface DashboardMobileOverviewProps {
  isOfficer: boolean;
  canViewIncidents: boolean;
  canViewCameras: boolean;
  pendingCount: number | null;
  confirmedCount: number | null;
  onlineCameras: number | null;
  totalCameras: number | null;
  pendingHref: string;
  confirmedHref: string;
  viewAllHref: string;
  incidents: IncidentItem[];
  incidentsLoading: boolean;
  incidentsError: boolean;
  onRetry: () => void;
  highlightedId?: string | null;
}

/**
 * Tổng quan trên mobile (< 768px): một hàng ô số liệu bấm được + danh sách sự cố chưa xử lý.
 * Bỏ trên mobile: mô hình 3D, đồng hồ, tab 01/02/03, biểu đồ, lối tắt (đã có tab đáy).
 */
export function DashboardMobileOverview({
  isOfficer,
  canViewIncidents,
  canViewCameras,
  pendingCount,
  confirmedCount,
  onlineCameras,
  totalCameras,
  pendingHref,
  confirmedHref,
  viewAllHref,
  incidents,
  incidentsLoading,
  incidentsError,
  onRetry,
  highlightedId,
}: DashboardMobileOverviewProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const show = (value: number | null) => (value === null ? "—" : String(value));

  const pendingTile: StatTile = {
    key: "pending",
    label: isVietnamese ? "Chờ duyệt" : "To review",
    value: show(pendingCount),
    href: pendingHref,
    tone: pendingCount ? "warning" : "muted",
  };
  const confirmedTile: StatTile = {
    key: "confirmed",
    label: t("incidents.status.confirmed"),
    value: show(confirmedCount),
    href: confirmedHref,
    tone: confirmedCount ? "primary" : "muted",
  };
  const cameraTile: StatTile = {
    key: "cameras",
    label: isVietnamese ? "Camera bật" : "Cameras on",
    value:
      onlineCameras === null || totalCameras === null ? "—" : `${onlineCameras}/${totalCameras}`,
    href: "/cameras",
    tone:
      !totalCameras || onlineCameras === null
        ? "muted"
        : onlineCameras < totalCameras
          ? "warning"
          : "success",
  };

  const tiles: StatTile[] = [
    ...(canViewIncidents ? (isOfficer ? [confirmedTile, pendingTile] : [pendingTile, confirmedTile]) : []),
    ...(canViewCameras ? [cameraTile] : []),
  ];

  return (
    <div className="space-y-5">
      <h1 className="sr-only">{t("nav.dashboard")}</h1>

      {tiles.length > 0 && (
        <ul
          className="grid gap-2.5"
          style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
        >
          {tiles.map((tile) => (
            <li key={tile.key}>
              <Link
                href={tile.href}
                className="flex min-h-20 flex-col justify-between rounded-2xl border border-border/70 bg-background p-3 shadow-nm-sm transition-shadow active:shadow-nm-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <span className={`text-2xl font-bold tabular-nums leading-none ${TONE_CLASS[tile.tone]}`}>
                  {tile.value}
                </span>
                <span className="mt-2 line-clamp-2 text-sm font-medium leading-tight text-muted-foreground">
                  {tile.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {canViewIncidents && (
        <section aria-labelledby="dashboard-mobile-incidents" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="dashboard-mobile-incidents" className="text-base font-bold text-foreground">
              {isVietnamese ? "Sự cố chưa xử lý" : "Open incidents"}
            </h2>
            <Link
              href={viewAllHref}
              className="-mr-2 inline-flex h-11 items-center gap-0.5 rounded-full px-2 text-sm font-semibold text-primary active:bg-primary/10"
            >
              {isVietnamese ? "Xem tất cả" : "View all"}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <IncidentMobileList
            incidents={incidents.slice(0, 5)}
            loading={incidentsLoading}
            error={incidentsError ? new Error("load failed") : undefined}
            onRetry={onRetry}
            showStatus
            highlightedId={highlightedId}
            page={1}
            totalPages={1}
            onPageChange={() => undefined}
          />
        </section>
      )}
    </div>
  );
}
