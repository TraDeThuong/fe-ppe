"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Copy,
  Edit2,
  FileDown,
  Layers,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { SiteContactOfficer, SiteItem } from "@/types";

export interface SiteDetailHeroProps {
  site: SiteItem;
  onEdit: () => void;
  onManageZones: () => void;
  onSafetyConfig: () => void;
  onExportReport?: () => void;
  onViewPersonnel?: () => void;
}

export function SiteDetailHero({
  site,
  onEdit,
  onManageZones,
  onSafetyConfig,
  onExportReport,
  onViewPersonnel,
}: SiteDetailHeroProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const isActive = site.status === "ACTIVE";

  // Safely parse officers list
  const officers: SiteContactOfficer[] = useMemo(() => {
    if (!site.contactOfficers) return [];
    if (Array.isArray(site.contactOfficers)) return site.contactOfficers;
    if (typeof site.contactOfficers === "string") {
      try {
        const parsed = JSON.parse(site.contactOfficers);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [site.contactOfficers]);

  // Fallback to legacy contactPerson / contactPhone if officers is empty
  const displayOfficers: SiteContactOfficer[] = useMemo(() => {
    if (officers.length > 0) return officers;
    if (!site.contactPerson) return [];
    const phones = site.contactPhone
      ? site.contactPhone
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
    return [
      {
        name: site.contactPerson,
        roleTitle: isVietnamese ? "Cán bộ phụ trách" : "Officer in Charge",
        phones,
      },
    ];
  }, [officers, site.contactPerson, site.contactPhone, isVietnamese]);

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };


return (
  <div className="space-y-4">
    {/* ── 1. TOP BAR ─────────────────────────────────────── */}
    <div className="flex flex-wrap items-center justify-between gap-2.5">
      <button
        type="button"
        onClick={() => router.push("/sites")}
        className="
          group inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5
          border border-white/70 bg-surface text-xs font-semibold
          text-muted-foreground
          shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)]
          transition-all duration-200
          hover:-translate-y-0.5 hover:text-primary
          hover:shadow-[5px_5px_10px_var(--shadow-dark),-4px_-4px_9px_rgba(255,255,255,0.95)]
          active:translate-y-[1px]
          active:shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]
          dark:border-white/5 dark:bg-card
          dark:shadow-[3px_3px_7px_rgba(0,0,0,0.38),-2px_-2px_6px_rgba(255,255,255,0.025)]
        "
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
        <span className="sm:hidden">{t("sites.detail.backShort")}</span>
        <span className="hidden sm:inline">{t("sites.detail.back")}</span>
      </button>

      <div className="
        flex items-center gap-1 sm:gap-1.5 rounded-2xl p-1 sm:p-1.5
        border border-white/60 bg-surface/90
        shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.75)]
        dark:border-white/5 dark:bg-card/80
        dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-1px_-1px_4px_rgba(255,255,255,0.025)]
      ">
        <Button
          variant="outline"
          size="sm"
          onClick={onManageZones}
          className="h-8 rounded-xl border-transparent px-2.5 sm:px-3 text-xs text-primary shadow-none hover:border-primary/20 hover:bg-primary/10"
        >
          <Layers className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("sites.card.zonesAndRestricted")}</span>
          <span className="sm:hidden">{isVietnamese ? "Khu vực" : "Zones"}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSafetyConfig}
          className="h-8 rounded-xl border-transparent px-2.5 sm:px-3 text-xs text-accent shadow-none hover:border-accent/20 hover:bg-accent/10"
        >
          <Shield className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("sites.card.ppeRules")}</span>
          <span className="sm:hidden">PPE</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-8 rounded-xl border-transparent px-2.5 sm:px-3 text-xs text-muted-foreground shadow-none hover:bg-background/70 hover:text-foreground"
        >
          <Edit2 className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("sites.detail.editSite")}</span>
          <span className="sm:hidden">{t("sites.detail.editSiteShort")}</span>
        </Button>

        {onExportReport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportReport}
            className="hidden h-8 rounded-xl border-transparent px-3 text-xs text-muted-foreground shadow-none hover:bg-background/70 hover:text-foreground md:inline-flex"
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            <span>{t("sites.detail.exportReport")}</span>
          </Button>
        )}
      </div>
    </div>

    {/* ── 2. SITE OVERVIEW ───────────────────────────────── */}
    <section
      className="
        relative overflow-hidden rounded-[24px]
        border border-white/80 bg-surface p-3.5 sm:p-5 lg:p-6
        shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.9)]
        transition-shadow duration-300
        dark:border-white/[0.06] dark:bg-card
        dark:shadow-[8px_8px_20px_rgba(0,0,0,0.48),-3px_-3px_10px_rgba(255,255,255,0.025)]
      "
    >
      {/* Ánh sáng bề mặt */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/10" />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(310px,0.78fr)] xl:gap-6">
        {/* ── LEFT: SITE IDENTITY ───────────────────────── */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          {/* Identity */}
          <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
            <div
              className="
                relative flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[14px] sm:rounded-[18px]
                border border-white/80 bg-surface-elevated/80 text-primary
                shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,0.95)]
                dark:border-white/10 dark:bg-card
                dark:shadow-[5px_5px_10px_rgba(0,0,0,0.45),-2px_-2px_7px_rgba(255,255,255,0.035)]
              "
            >
              <Building2 className="h-5 w-5 sm:h-7 sm:w-7 stroke-[1.7]" />
              <span className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface dark:ring-card" />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="min-w-0 break-words text-lg font-extrabold leading-tight tracking-tight text-foreground sm:text-2xl">
                  {site.name}
                </h1>

                <span
                  className="
                    inline-flex h-5 sm:h-6 items-center rounded-lg px-1.5 sm:px-2
                    border border-primary/15 bg-primary/[0.07]
                    font-mono text-[9px] sm:text-[10px] font-bold tracking-wide text-primary
                    shadow-[1px_1px_3px_var(--shadow-dark),-1px_-1px_3px_rgba(255,255,255,0.8)]
                    dark:bg-primary/10
                  "
                >
                  {site.code}
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("sites.detail.subtitle")}
              </p>

              <div className="mt-2">
                <span
                  className={`
                    inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5
                    border text-[10px] sm:text-[11px] font-bold
                    shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)]
                    ${
                      isActive
                        ? "border-primary/20 bg-primary/[0.09] text-primary"
                        : "border-border/50 bg-background/70 text-muted-foreground"
                    }
                    dark:shadow-[2px_2px_5px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.025)]
                  `}
                >
                  <span className="relative flex h-2 w-2">
                    {isActive && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                    )}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${
                        isActive ? "bg-primary" : "bg-muted-foreground/50"
                      }`}
                    />
                  </span>
                  {isActive ? t("sites.status.active") : t("sites.status.inactive")}
                </span>
              </div>
            </div>
          </div>

          {/* Address & Description: recessed panel */}
          <div
            className="
              relative space-y-3 rounded-2xl p-3.5 sm:p-4
              border border-black/[0.025] bg-background/55
              shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.8)]
              dark:border-white/[0.035] dark:bg-background/40
              dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]
            "
          >
            <div className="flex items-start gap-3">
              <div className="
                flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                border border-white/70 bg-surface text-primary
                shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_rgba(255,255,255,0.9)]
                dark:border-white/5 dark:bg-card
                dark:shadow-[3px_3px_6px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.025)]
              ">
                <MapPin className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1 py-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/75">
                  {isVietnamese ? "ĐỊA CHỈ CÔNG TRƯỜNG" : "SITE LOCATION"}
                </p>
                <p className="mt-1 break-words text-sm font-semibold leading-relaxed text-foreground">
                  {site.address || t("sites.card.noAddress")}
                </p>
              </div>
            </div>

            {site.description && (
              <div className="flex items-start gap-3 border-t border-border/30 pt-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground">
                  <Layers className="h-4 w-4" />
                </div>
                <p className="min-w-0 flex-1 py-1 text-xs leading-[1.8] text-muted-foreground">
                  {site.description}
                </p>
              </div>
            )}
          </div>

          {/* Small visual divider */}
          <div className="flex items-center gap-2 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
            <span className="h-px w-8 bg-gradient-to-r from-primary/40 to-transparent" />
            <span className="text-[10px] font-semibold tracking-wide text-muted-foreground/70">
              {isVietnamese ? "THÔNG TIN CÔNG TRƯỜNG" : "SITE OVERVIEW"}
            </span>
          </div>
        </div>

        {/* ── RIGHT: SAFETY TEAM ─────────────────────────── */}
        <div
          className="
            relative rounded-[21px] p-3.5 sm:p-4
            border border-white/80 bg-surface-elevated/65
            shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),7px_7px_15px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.85)]
            dark:border-white/[0.06] dark:bg-background/55
            dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.035),6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)]
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="
                  flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]
                  border border-white/80 bg-surface text-primary
                  shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_rgba(255,255,255,0.95)]
                  dark:border-white/10 dark:bg-card
                  dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.025)]
                "
              >
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-extrabold tracking-tight text-foreground">
                  {t("sites.form.officersTitle")}
                </h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {isVietnamese ? "Đầu mối liên hệ an toàn" : "Safety contact directory"}
                </p>
              </div>
            </div>

            <span
              className="
                flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl px-2
                border border-primary/15 bg-primary/[0.08] font-mono text-xs font-extrabold text-primary
                shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)]
                dark:bg-primary/10
              "
            >
              {displayOfficers.length}
            </span>
          </div>

          {/* Officers */}
          {displayOfficers.length > 0 ? (
            <div className="mt-3.5 space-y-3">
              {displayOfficers.slice(0, 2).map((officer, oIdx) => (
                <div
                  key={oIdx}
                  className="
                    group relative rounded-[15px] p-3
                    border border-white/80 bg-surface
                    shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_rgba(255,255,255,0.95)]
                    transition-all duration-200
                    hover:-translate-y-0.5
                    hover:shadow-[6px_6px_12px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,1)]
                    dark:border-white/[0.06] dark:bg-card
                    dark:shadow-[4px_4px_9px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.025)]
                    dark:hover:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)]
                  "
                >
                  {/* White top highlight */}
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/10" />

                  <div className="flex items-start gap-2.5">
                    <div
                      className="
                        flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                        border border-primary/10 bg-primary/[0.08] text-primary
                        shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.9)]
                        dark:bg-primary/10
                      "
                    >
                      <User className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="break-words text-xs font-bold leading-relaxed text-foreground">
                        {officer.name}
                      </p>

                      {officer.roleTitle && (
                        <span className="mt-1.5 inline-flex max-w-full rounded-md border border-primary/10 bg-primary/[0.07] px-2 py-1 text-[10px] font-semibold leading-snug text-primary">
                          {officer.roleTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {officer.phones && officer.phones.length > 0 ? (
                    <div className="mt-3 space-y-2 border-t border-border/25 pt-2.5">
                      {officer.phones.map((phone, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex min-w-0 items-center justify-between gap-2"
                        >
                          <a
                            href={`tel:${phone}`}
                            className="
                              flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1
                              text-[11px] font-medium text-muted-foreground transition-colors
                              hover:text-primary
                            "
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                            <span className="break-all font-mono">{phone}</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyPhone(phone)}
                            title={isVietnamese ? "Sao chép số" : "Copy phone"}
                            aria-label={isVietnamese ? "Sao chép số điện thoại" : "Copy phone number"}
                            className="
                              flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                              border border-white/70 bg-surface-elevated/70 text-muted-foreground
                              shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_rgba(255,255,255,0.85)]
                              transition-all hover:text-primary active:translate-y-px
                              active:shadow-[inset_2px_2px_3px_var(--shadow-dark)]
                              dark:border-white/5 dark:bg-background/60
                            "
                          >
                            {copiedPhone === phone ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-border/25 pt-2.5 text-[10px] italic text-muted-foreground/70">
                      {isVietnamese ? "Chưa có số hotline" : "No hotline configured"}
                    </p>
                  )}
                </div>
              ))}

              {/* View all */}
              {displayOfficers.length > 2 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    +{displayOfficers.length - 2}{" "}
                    {isVietnamese ? "cán bộ khác" : "other officers"}
                  </span>

                  {onViewPersonnel && (
                    <button
                      type="button"
                      onClick={onViewPersonnel}
                      className="group inline-flex items-center gap-1 text-[11px] font-bold text-primary transition-colors hover:text-primary/75"
                    >
                      {isVietnamese ? "Xem danh sách" : "View all"}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-background/40 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-muted-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_rgba(255,255,255,0.8)]">
                  <User className="h-4 w-4" />
                </div>
                <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
                  {isVietnamese
                    ? "Chưa có thông tin cán bộ phụ trách an toàn."
                    : "No safety officers assigned to this site yet."}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="mt-3 h-8 rounded-xl border-primary/20 px-3 text-xs text-primary hover:bg-primary/10"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                {isVietnamese ? "Phân công cán bộ" : "Assign Officers"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  </div>
);
}