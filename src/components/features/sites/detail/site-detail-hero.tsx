"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  Edit2,
  FileDown,
  Layers,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteDetailHeroProps {
  site: SiteItem;
  onEdit: () => void;
  onManageZones: () => void;
  onSafetyConfig: () => void;
  onExportReport?: () => void;
}

export function SiteDetailHero({
  site,
  onEdit,
  onManageZones,
  onSafetyConfig,
  onExportReport,
}: SiteDetailHeroProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const isActive = site.status === "ACTIVE";
  const officers = site.contactOfficers || [];
  const primaryOfficer = officers[0];

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Navigation Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/sites")}
          className="group inline-flex items-center gap-2 rounded-xl border border-border/40 bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:border-primary hover:text-primary dark:border-black/50 dark:bg-card/70 dark:hover:border-black"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
          <span>{t("sites.detail.back")}</span>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onManageZones}
            className="flex items-center gap-1.5 rounded-xl text-xs h-8 px-3 text-primary border-primary/30 hover:bg-primary/10"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("sites.card.zonesAndRestricted")}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSafetyConfig}
            className="flex items-center gap-1.5 rounded-xl text-xs h-8 px-3 text-accent border-accent/30 hover:bg-accent/10"
          >
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("sites.card.ppeRules")}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-xl text-xs h-8 px-3 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>{t("sites.detail.editSite")}</span>
          </Button>

          {onExportReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportReport}
              className="hidden md:flex items-center gap-1.5 rounded-xl text-xs h-8 px-3 text-muted-foreground hover:text-foreground"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{t("sites.detail.exportReport")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="rounded-2xl border border-border/40 bg-surface p-4 sm:p-6 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Site Identity & Address */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-nm-inset dark:bg-primary/20">
                <Building2 className="h-6 w-6" />
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                    {site.name}
                  </h1>

                  <span className="rounded-lg bg-surface-elevated/70 px-2 py-0.5 font-mono text-xs font-bold text-primary dark:bg-background/60">
                    {site.code}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "border-primary/30 bg-primary/10 text-primary dark:border-primary/30"
                        : "border-border/50 bg-background/60 text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/60"
                      }`}
                    />
                    {isActive ? t("sites.status.active") : t("sites.status.inactive")}
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("sites.detail.subtitle")}
                </p>
              </div>
            </div>

            {/* Address & Description */}
            <div className="space-y-1.5 pl-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="line-clamp-1">
                  {site.address || t("sites.card.noAddress")}
                </span>
              </div>

              {site.description && (
                <p className="text-xs text-muted-foreground/80 line-clamp-2 max-w-2xl">
                  {site.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Emergency Contact & Safety Team Card */}
          <div className="rounded-xl border border-border/40 bg-surface-elevated/30 p-3.5 sm:p-4 min-w-[280px] max-w-sm space-y-2.5 dark:border-black/50 dark:bg-background/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  {t("sites.form.officersTitle")}
                </span>
              </div>

              {officers.length > 1 && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {officers.length} cán bộ
                </span>
              )}
            </div>

            {/* Primary Officer */}
            {primaryOfficer ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <User className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{primaryOfficer.name}</span>
                  {primaryOfficer.roleTitle && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      ({primaryOfficer.roleTitle})
                    </span>
                  )}
                </div>

                {/* Phones list */}
                {primaryOfficer.phones && primaryOfficer.phones.length > 0 && (
                  <div className="space-y-1 pl-5">
                    {primaryOfficer.phones.map((phone, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground"
                      >
                        <a
                          href={`tel:${phone}`}
                          className="flex items-center gap-1 hover:text-primary transition"
                        >
                          <Phone className="h-3 w-3 text-primary/70" />
                          <span>{phone}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyPhone(phone)}
                          className="p-1 hover:text-foreground transition text-muted-foreground/70"
                          title="Sao chép số"
                        >
                          {copiedPhone === phone ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : site.contactPerson ? (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>{site.contactPerson}</span>
                </div>
                {site.contactPhone && (
                  <div className="flex items-center gap-1.5 font-mono text-muted-foreground pl-5">
                    <Phone className="h-3 w-3 text-primary/70" />
                    <a href={`tel:${site.contactPhone}`} className="hover:text-primary">
                      {site.contactPhone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Chưa có thông tin cán bộ phụ trách an toàn.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
