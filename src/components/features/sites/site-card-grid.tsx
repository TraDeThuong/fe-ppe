"use client";

import {
  AlertOctagon,
  Building2,
  Camera,
  Edit2,
  Layers,
  MapPin,
  Phone,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteSafetyBadges } from "./site-safety-badges";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteCardGridProps {
  sites: SiteItem[];
  onManageZones: (site: SiteItem) => void;
  onSafetyConfig: (site: SiteItem) => void;
  onEdit: (site: SiteItem) => void;
  onDelete: (site: SiteItem) => void;
  loading?: boolean;
}

export function SiteCardGrid({
  sites,
  onManageZones,
  onSafetyConfig,
  onEdit,
  onDelete,
  loading = false,
}: SiteCardGridProps) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-surface-elevated/40" />
        ))}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{t("sites.table.empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sites.map((site) => {
        const isActive = site.status === "ACTIVE";
        const zoneCount = site.zones?.length || site.zoneCount || 0;
        const restrictedCount =
          site.restrictedAreas?.length || site.restrictedAreaCount || 0;
        const safetyConfig = site.safetyConfigs?.[0] || null;

        return (
          <div
            key={site.id}
            className="flex flex-col justify-between rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 hover:shadow-[6px_6px_14px_rgba(0,0,0,0.08),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-foreground line-clamp-1">
                      {site.name}
                    </h4>
                    <span className="font-mono text-xs font-semibold text-primary">
                      {site.code}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  {site.status}
                </span>
              </div>

              {/* Address */}
              {site.address && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/70" />
                  <span className="line-clamp-2">{site.address}</span>
                </div>
              )}

              {/* Personnel / Contact info */}
              {(site.contactPerson || site.contactPhone) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {site.contactPerson && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{site.contactPerson}</span>
                    </span>
                  )}
                  {site.contactPhone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="h-3 w-3" />
                      <span>{site.contactPhone}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Spatial Stats Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-surface-elevated/70 px-2.5 py-1 text-xs text-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>{zoneCount} Phân khu</span>
                </span>

                <span className="inline-flex items-center gap-1 rounded-lg bg-surface-elevated/70 px-2.5 py-1 text-xs text-foreground">
                  <AlertOctagon className="h-3.5 w-3.5 text-danger" />
                  <span>{restrictedCount} Vùng cấm</span>
                </span>

                <span className="inline-flex items-center gap-1 rounded-lg bg-surface-elevated/70 px-2.5 py-1 text-xs text-foreground">
                  <Camera className="h-3.5 w-3.5 text-info" />
                  <span>{site.cameraCount || 0} Camera</span>
                </span>
              </div>

              {/* PPE Safety Rules Badges */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Tiêu chuẩn PPE:
                </span>
                <SiteSafetyBadges config={safetyConfig} />
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/30 pt-3">
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onManageZones(site)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Phân khu & Vùng cấm</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSafetyConfig(site)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Quy tắc PPE</span>
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(site)}
                  title={t("sites.actions.edit")}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(site)}
                  title={t("sites.actions.delete")}
                  className="rounded-xl p-2 text-danger/80 hover:bg-danger/10 hover:text-danger transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
