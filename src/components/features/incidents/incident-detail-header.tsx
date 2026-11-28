"use client";

import React from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  BellRing,
  Building2,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit3,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Video,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { IncidentStatusBadge } from "./incident-status-badge";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";

export interface IncidentDetailHeaderProps {
  incident: IncidentItem;
  isConnected?: boolean;
  isRefreshing?: boolean;
  isNotifying?: boolean;
  hasAssignments: boolean;
  canUpdate: boolean;
  canTriggerAlert: boolean;
  canReview: boolean;
  canAssign: boolean;
  canSelfOrAssignedResolve: boolean;
  canClose: boolean;
  onRefresh: () => void;
  onEdit: () => void;
  onTriggerAlert: () => void;
  onReview: () => void;
  onAssign: () => void;
  onResolve: () => void;
  onClose: () => void;
}

export function IncidentDetailHeader({
  incident,
  isConnected = true,
  isRefreshing = false,
  isNotifying = false,
  hasAssignments,
  canUpdate,
  canTriggerAlert,
  canReview,
  canAssign,
  canSelfOrAssignedResolve,
  canClose,
  onRefresh,
  onEdit,
  onTriggerAlert,
  onReview,
  onAssign,
  onResolve,
  onClose,
}: IncidentDetailHeaderProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getCameraCode, getCameraName } = useEntityLookup();

  const siteName = incident.siteName || getSiteName(incident.siteId);
  const cameraCode = incident.cameraCode || getCameraCode(incident.cameraId);
  const cameraName = incident.cameraName || getCameraName(incident.cameraId);

  const detectedLabel = new Date(incident.detectedAt).toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatViolation = (type: string) => {
    switch (type) {
      case "NO_HELMET":
        return t("incidents.violation.noHelmet");
      case "NO_VEST":
        return t("incidents.violation.noVest");
      case "RESTRICTED_AREA":
        return t("incidents.violation.restrictedArea");
      case "MULTI_VIOLATION":
        return t("incidents.violation.multi");
      default:
        return type;
    }
  };

  const showEditBtn = canUpdate && incident.status !== "CLOSED";
  const showNotifyBtn = canTriggerAlert && incident.status !== "CLOSED";

  const showReviewPrimary = incident.status === "PENDING_REVIEW" && canReview;
  const showAssignPrimary =
    incident.status === "CONFIRMED" && !hasAssignments && canAssign;
  const showResolveSecondary =
    incident.status === "CONFIRMED" &&
    !hasAssignments &&
    canAssign &&
    canSelfOrAssignedResolve;
  const showResolvePrimary =
    incident.status === "CONFIRMED" &&
    canSelfOrAssignedResolve &&
    (hasAssignments || !canAssign);
  const showReassignSecondary =
    incident.status === "CONFIRMED" && hasAssignments && canAssign;
  const showClosePrimary =
    (incident.status === "RESOLVED" || incident.status === "DISMISSED") && canClose;

  const hasRecordTools =
    showEditBtn || showNotifyBtn || showReassignSecondary || showResolveSecondary;

  return (
    <section
      aria-label={
        isVietnamese
          ? `Tiêu đề chi tiết sự cố #${incident.id.slice(0, 8)}`
          : `Incident #${incident.id.slice(0, 8)} Detail Header`
      }
      className={`group/header relative overflow-hidden rounded-[28px] p-4 sm:rounded-[34px] sm:p-6 lg:p-8 transition-all duration-500 ${NM.chassis}`}
    >
      {/* ── AMBIENT CINEMATIC LIGHTING & RIM HIGHLIGHTS ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-12 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-primary/50"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl opacity-80 transition-opacity duration-700 group-hover/header:opacity-100 dark:bg-primary/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-16 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl opacity-60"
      />

      <div className="relative space-y-6">
        {/* ── TẦNG 1: NHẬN DIỆN SỰ CỐ (TRÁI) & SCULPTED HERO CTA (PHẢI) ── */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          {/* Left: Back + 3D Medallion + Identity */}
          <div className="flex items-start gap-3.5 sm:gap-5 min-w-0">
            <Link
              href="/incidents"
              title={isVietnamese ? "Quay lại danh sách sự cố" : "Back to incidents"}
              aria-label={isVietnamese ? "Quay lại danh sách sự cố" : "Back to incidents"}
              className={`group/back mt-1 flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl text-foreground transition-all duration-300 hover:text-primary active:scale-95 ${NM.tactileBtn}`}
            >
              <ArrowLeft className="size-5 transition-transform duration-300 group-hover/back:-translate-x-0.5" />
            </Link>

            {/* 3D Sculpted Telemetry Medallion */}
            <div
              className={`relative hidden h-16 w-16 shrink-0 items-center justify-center rounded-[22px] p-1.5 sm:flex ${NM.recessed}`}
            >
              <div
                className={`relative flex h-full w-full items-center justify-center rounded-2xl ${NM.extruded}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_6px_14px_-2px_hsl(var(--primary)/0.45)]">
                  <ShieldAlert className="size-5 drop-shadow-sm" />
                </div>
              </div>

              <span
                title={isConnected ? "Realtime" : "Polling (30s)"}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background shadow-[0_2px_6px_rgba(0,0,0,0.18)] ring-2 ring-background"
              >
                {isConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-45" />
                )}
                <span
                  className={`relative h-2 w-2 rounded-full ${isConnected
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-amber-500"
                    }`}
                />
              </span>
            </div>

            {/* Title & Telemetry Metadata */}
            <div className="min-w-0 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                  {isVietnamese ? "Hồ sơ giám sát an toàn" : "Safety Incident Dossier"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <h1 className="text-xl font-black tracking-tight text-foreground sm:text-[26px] sm:leading-none">
                  {t("incidents.detailTitle")}
                </h1>

                <span
                  className={`inline-flex items-center rounded-xl px-2.5 py-1 font-mono text-sm font-extrabold tracking-wider text-primary sm:text-base ${NM.recessed}`}
                >
                  #{incident.id.slice(0, 8)}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <IncidentSeverityBadge severity={incident.severity} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-extrabold tracking-wide text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                  {formatViolation(incident.violationType)}
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold ${isConnected ? "text-primary" : "text-amber-600 dark:text-amber-400"
                    } ${NM.recessed}`}
                >
                  <span className="relative flex h-2 w-2">
                    {isConnected && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                    )}
                    <span
                      className={`relative h-2 w-2 rounded-full ${isConnected ? "bg-primary" : "bg-amber-500"
                        }`}
                    />
                  </span>
                  {isConnected ? "Realtime" : "Polling (30s)"}
                </span>

                <span
                  title={siteName}
                  className={`inline-flex max-w-[230px] items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-semibold text-foreground ${NM.recessed}`}
                >
                  <Building2 className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{siteName}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold text-muted-foreground ${NM.recessed}`}
                >
                  <Clock className="size-3.5 shrink-0 text-amber-500" />
                  <span>{detectedLabel}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Sync Switch + Sculpted Dual-Layer Primary Action */}
          <div className="flex flex-wrap items-center gap-3.5 self-start xl:self-center shrink-0">
            {/* Sync Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`group/sync inline-flex h-12 sm:h-14 shrink-0 cursor-pointer items-center gap-3 rounded-2xl px-3.5 sm:px-4 text-xs font-bold uppercase tracking-wider text-foreground transition-all duration-300 hover:text-primary active:scale-[0.98] disabled:opacity-60 ${NM.tactileBtn}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover/sync:scale-105 ${NM.recessed}`}
              >
                <RefreshCw
                  className={`size-4 text-primary transition-transform duration-500 ${isRefreshing ? "animate-spin" : "group-hover/sync:rotate-180"
                    }`}
                />
              </span>
              <span className="text-left leading-tight">
                <span className="block font-extrabold">
                  {isRefreshing
                    ? isVietnamese
                      ? "Đang đồng bộ"
                      : "Syncing"
                    : t("common.refresh")}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                  {isVietnamese ? "Hồ sơ sự cố" : "Incident record"}
                </span>
              </span>
            </button>

            {/* Primary CTA: Review */}
            {showReviewPrimary && (
              <div className={`rounded-[20px] p-1 ${NM.recessed}`}>
                <button
                  type="button"
                  onClick={onReview}
                  className="group/cta relative inline-flex h-11 sm:h-12 shrink-0 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/85 pl-2.5 pr-5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.55),inset_0_1.5px_1px_rgba(255,255,255,0.45)] transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
                  />
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-xs">
                    <CheckSquare className="size-4" />
                  </span>
                  <span>{t("incidents.actions.review")}</span>
                </button>
              </div>
            )}

            {/* Primary CTA: Assign */}
            {showAssignPrimary && (
              <div className={`rounded-[20px] p-1 ${NM.recessed}`}>
                <button
                  type="button"
                  onClick={onAssign}
                  className="group/cta relative inline-flex h-11 sm:h-12 shrink-0 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/85 pl-2.5 pr-5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.55),inset_0_1.5px_1px_rgba(255,255,255,0.45)] transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
                  />
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-xs">
                    <UserCheck className="size-4" />
                  </span>
                  <span>{t("incidents.actions.assign")}</span>
                </button>
              </div>
            )}

            {/* Primary CTA: Resolve (Nút Giải quyết điêu khắc 2 lớp cực sang) */}
            {showResolvePrimary && (
              <div className={`rounded-[20px] p-1 ${NM.recessed}`}>
                <button
                  type="button"
                  onClick={onResolve}
                  className="group/cta relative inline-flex h-11 sm:h-12 shrink-0 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 pl-2.5 pr-5 text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_10px_24px_-4px_rgba(16,185,129,0.55),inset_0_1.5px_1px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(6,78,59,0.4)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_12px_28px_-4px_rgba(16,185,129,0.7),inset_0_1.5px_1px_rgba(255,255,255,0.6)] active:scale-[0.98]"
                >
                  {/* Specular Light Sweep */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
                  />
                  {/* Glass Icon Well */}
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_2px_6px_rgba(0,0,0,0.12)] transition-transform duration-300 group-hover/cta:scale-105">
                    <CheckCircle2 className="size-4 drop-shadow-sm" />
                  </span>
                  <span className="tracking-[0.08em] drop-shadow-xs">
                    {t("incidents.actions.resolve")}
                  </span>
                </button>
              </div>
            )}

            {/* Primary CTA: Close */}
            {showClosePrimary && (
              <div className={`rounded-[20px] p-1 ${NM.recessed}`}>
                <button
                  type="button"
                  onClick={onClose}
                  className="group/cta relative inline-flex h-11 sm:h-12 shrink-0 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 pl-2.5 pr-5 text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_8px_20px_-4px_rgba(15,23,42,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.3)] transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
                  />
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
                    <Archive className="size-4" />
                  </span>
                  <span>{t("incidents.actions.close")}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── TẦNG 2: SPLIT HARDWARE CONTROL DECK (2 MODULE ĐỘC LẬP, SẠCH & GỌN) ── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* MODULE 1 (TRÁI): NAVIGATION DOCK */}
          <div
            className={`flex flex-wrap items-center gap-2 rounded-2xl p-1.5 sm:px-2.5 ${NM.recessed}`}
          >
            <span className="hidden xl:inline-flex items-center gap-1.5 pl-2 pr-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/75">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
              {isVietnamese ? "Điều hướng" : "Navigate"}
            </span>

            {/* Camera Studio Key */}
            <Link
              href={
                incident.cameraId
                  ? `/cameras/${incident.cameraId}`
                  : `/cameras?search=${encodeURIComponent(cameraCode)}&view=wall`
              }
              title={
                isVietnamese
                  ? `Mở Camera AI Intelligence Studio (${cameraName || cameraCode})`
                  : `Open Camera AI Intelligence Studio (${cameraName || cameraCode})`
              }
              className={`group/nav inline-flex h-10 items-center gap-2.5 rounded-xl px-3.5 text-xs font-bold text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/nav:bg-primary group-hover/nav:text-primary-foreground">
                <Video className="size-3.5" />
              </span>
              <span>{isVietnamese ? "Xem Camera" : "View Camera"}</span>

              {cameraCode && (
                <span
                  className={`ml-0.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold tracking-wider text-primary ${NM.recessed}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                  {cameraCode}
                </span>
              )}
            </Link>

            {/* Site Operations Key */}
            {incident.siteId && (
              <Link
                href={`/sites/${incident.siteId}?tab=live-cameras`}
                title={
                  isVietnamese
                    ? `Mở trung tâm điều hành công trường ${siteName}`
                    : `Open site operations center: ${siteName}`
                }
                className={`group/nav inline-flex h-10 items-center gap-2.5 rounded-xl px-3.5 text-xs font-bold text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/nav:bg-primary group-hover/nav:text-primary-foreground">
                  <Building2 className="size-3.5" />
                </span>
                <span>{isVietnamese ? "Mở Công trường" : "Open Site"}</span>
              </Link>
            )}
          </div>

          {/* MODULE 2 (PHẢI): TACTILE ACTION SWITCHBOARD */}
          {hasRecordTools && (
            <div
              className={`flex flex-wrap items-center gap-2 rounded-2xl p-1.5 sm:px-2.5 ${NM.recessed}`}
            >
              <span className="hidden xl:inline-flex items-center gap-1.5 pl-2 pr-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/75">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500/80" />
                {isVietnamese ? "Tác vụ" : "Actions"}
              </span>

              {showEditBtn && (
                <button
                  type="button"
                  onClick={onEdit}
                  className={`group/act inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-xs font-bold text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
                >
                  <Edit3 className="size-3.5 text-primary transition-transform duration-200 group-hover/act:-rotate-6" />
                  <span>{isVietnamese ? "Sửa" : "Edit"}</span>
                </button>
              )}

              {showNotifyBtn && (
                <button
                  type="button"
                  onClick={onTriggerAlert}
                  disabled={isNotifying}
                  title={
                    isVietnamese
                      ? "Gửi lại cảnh báo sự cố qua App & Email"
                      : "Re-notify officers via App & Email"
                  }
                  className={`group/act inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-xs font-bold text-amber-600 transition-all duration-200 hover:text-amber-700 active:scale-[0.98] disabled:opacity-50 dark:text-amber-400 ${NM.tactileBtn}`}
                >
                  <BellRing
                    className={`size-3.5 transition-transform duration-200 group-hover/act:rotate-12 ${isNotifying ? "animate-pulse" : ""
                      }`}
                  />
                  <span>{isVietnamese ? "Báo động lại" : "Re-notify"}</span>
                </button>
              )}

              {showReassignSecondary && (
                <button
                  type="button"
                  onClick={onAssign}
                  className={`group/act inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-xs font-bold text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
                >
                  <UserPlus className="size-3.5 text-primary transition-transform duration-200 group-hover/act:scale-110" />
                  <span>{t("incidents.actions.assign")}</span>
                </button>
              )}

              {showResolveSecondary && (
                <button
                  type="button"
                  onClick={onResolve}
                  className={`group/act inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-xs font-bold text-emerald-600 transition-all duration-200 hover:text-emerald-700 active:scale-[0.98] dark:text-emerald-400 ${NM.tactileBtn}`}
                >
                  <CheckCircle2 className="size-3.5 transition-transform duration-200 group-hover/act:scale-110" />
                  <span>{t("incidents.actions.resolve")}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
