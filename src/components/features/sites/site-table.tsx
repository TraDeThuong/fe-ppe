"use client";

import { Building2, Edit2, Layers, Shield, Trash2 } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteTableProps {
  sites: SiteItem[];
  onManageZones: (site: SiteItem) => void;
  onSafetyConfig: (site: SiteItem) => void;
  onEdit: (site: SiteItem) => void;
  onDelete: (site: SiteItem) => void;
  loading?: boolean;
}

export function SiteTable({
  sites,
  onManageZones,
  onSafetyConfig,
  onEdit,
  onDelete,
  loading = false,
}: SiteTableProps) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-elevated/40" />
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
    <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border/40 bg-surface-elevated/40 text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-5 py-3.5">{t("sites.table.name")}</th>
            <th className="px-5 py-3.5">{t("sites.table.address")}</th>
            <th className="px-5 py-3.5">{t("sites.table.zonesCount")}</th>
            <th className="px-5 py-3.5">{t("sites.table.restrictedCount")}</th>
            <th className="px-5 py-3.5">{t("sites.table.status")}</th>
            <th className="px-5 py-3.5 text-right">{t("sites.table.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {sites.map((site) => {
            const isActive = site.status === "ACTIVE";
            const zoneCount = site.zones?.length || site.zoneCount || 0;
            const restrictedCount =
              site.restrictedAreas?.length || site.restrictedAreaCount || 0;

            return (
              <tr
                key={site.id}
                className="transition-colors duration-150 hover:bg-surface-elevated/30"
              >
                {/* Site Name & Code */}
                <td className="px-5 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground">{site.name}</span>
                    <span className="font-mono text-xs text-primary">{site.code}</span>
                  </div>
                </td>

                {/* Address */}
                <td className="px-5 py-4">
                  <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                    {site.address || t("sites.card.noAddress")}
                  </span>
                </td>

                {/* Zones Count */}
                <td className="px-5 py-4">
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {zoneCount} {t("sites.units.zones")}
                  </span>
                </td>

                {/* Restricted Count */}
                <td className="px-5 py-4">
                  <span className="font-mono text-xs font-semibold text-accent">
                    {restrictedCount} {t("sites.units.restricted")}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                      isActive
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted/40 text-muted-foreground border-border/40"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/60"
                      }`}
                    />
                    {isActive
                      ? t("sites.status.active")
                      : site.status === "INACTIVE"
                        ? t("sites.status.inactive")
                        : t("sites.status.suspended")}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onManageZones(site)}
                      title={t("sites.actions.manageZones")}
                      className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition"
                    >
                      <Layers className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onSafetyConfig(site)}
                      title={t("sites.actions.safetyConfig")}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
                    >
                      <Shield className="h-4 w-4 text-accent" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(site)}
                      title={t("sites.actions.edit")}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(site)}
                      title={t("sites.actions.delete")}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
