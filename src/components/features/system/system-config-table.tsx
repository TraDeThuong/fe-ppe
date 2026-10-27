"use client";

import { Edit2, Globe, Lock, Trash2 } from "lucide-react";
import type { SystemConfigItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";

export interface SystemConfigTableProps {
  items: SystemConfigItem[];
  onEdit: (config: SystemConfigItem) => void;
  onDelete: (config: SystemConfigItem) => void;
  loading?: boolean;
}

export function SystemConfigTable({
  items,
  onEdit,
  onDelete,
  loading = false,
}: SystemConfigTableProps) {
  const { t } = useLocale();

  const renderValuePreview = (val: unknown) => {
    if (typeof val === "boolean") {
      return (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            val ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {String(val)}
        </span>
      );
    }
    if (typeof val === "object" && val !== null) {
      return (
        <span className="font-mono text-xs text-info bg-info/10 px-2 py-0.5 rounded">
          {JSON.stringify(val).slice(0, 40)}...
        </span>
      );
    }
    return (
      <span className="font-mono text-xs text-foreground/90 max-w-[240px] truncate block">
        {String(val ?? "")}
      </span>
    );
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "SECURITY":
        return "bg-danger/10 text-danger border-danger/30";
      case "FEATURE_FLAG":
        return "bg-brand/10 text-brand border-brand/30";
      case "INTEGRATION":
        return "bg-info/10 text-info border-info/30";
      default:
        return "bg-muted text-muted-foreground border-border/40";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-elevated/40" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center">
        <p className="text-sm text-muted-foreground">{t("system.configs.empty")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border/40 bg-surface-elevated/40 text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-5 py-3.5">{t("system.configs.tableKey")}</th>
            <th className="px-5 py-3.5">{t("system.configs.tableValue")}</th>
            <th className="px-5 py-3.5">{t("system.configs.tableCategory")}</th>
            <th className="px-5 py-3.5">{t("system.configs.tablePublic")}</th>
            <th className="px-5 py-3.5 text-right">{t("system.configs.tableActions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {items.map((item) => (
            <tr
              key={item.id}
              className="transition-colors duration-150 hover:bg-surface-elevated/30"
            >
              <td className="px-5 py-4">
                <div className="space-y-1">
                  <span className="font-mono text-xs font-bold text-primary">
                    {item.key}
                  </span>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-sm">
                      {item.description}
                    </p>
                  )}
                </div>
              </td>

              <td className="px-5 py-4">{renderValuePreview(item.value)}</td>

              <td className="px-5 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryBadgeClass(
                    String(item.category),
                  )}`}
                >
                  {item.category}
                </span>
              </td>

              <td className="px-5 py-4">
                {item.isPublic ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <Globe className="h-3.5 w-3.5" />
                    {t("system.configs.public")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    {t("system.configs.private")}
                  </span>
                )}
              </td>

              <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary"
                    aria-label={`Edit ${item.key}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-danger hover:text-danger"
                    aria-label={`Delete ${item.key}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
