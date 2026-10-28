"use client";

import Link from "next/link";
import { Activity, Building2, Edit2, Play, ShieldAlert, Sliders, Trash2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";

export interface CameraTableProps {
  cameras: CameraItem[];
  onViewLive: (camera: CameraItem) => void;
  onPing: (camera: CameraItem) => void;
  onConfigureRoi: (camera: CameraItem) => void;
  onEdit: (camera: CameraItem) => void;
  onDelete: (camera: CameraItem) => void;
  loading?: boolean;
}

export function CameraTable({
  cameras,
  onViewLive,
  onPing,
  onConfigureRoi,
  onEdit,
  onDelete,
  loading = false,
}: CameraTableProps) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-elevated/40" />
        ))}
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center">
        <p className="text-sm text-muted-foreground">{t("cameras.table.empty")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border/40 bg-surface-elevated/40 text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-5 py-3.5">{t("cameras.table.name")}</th>
            <th className="px-5 py-3.5">{t("cameras.table.site")}</th>
            <th className="px-5 py-3.5">{t("cameras.table.sourceType")}</th>
            <th className="px-5 py-3.5">{t("cameras.table.status")}</th>
            <th className="px-5 py-3.5">{t("cameras.table.latency")}</th>
            <th className="px-5 py-3.5 text-right">{t("cameras.table.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {cameras.map((camera) => {
            const isOnline = camera.status === "ONLINE";

            return (
              <tr
                key={camera.id}
                className="transition-colors duration-150 hover:bg-surface-elevated/30"
              >
                {/* Camera Name & Code */}
                <td className="px-5 py-4">
                  <div className="flex flex-col">
                    <Link
                      href={`/cameras/${camera.id}`}
                      className="font-bold text-foreground hover:text-primary transition hover:underline"
                      title="Mở Camera AI Intelligence Studio"
                    >
                      {camera.name}
                    </Link>
                    <span className="font-mono text-xs text-primary">{camera.code}</span>
                  </div>
                </td>

                {/* Site & Zone */}
                <td className="px-5 py-4">
                  <div className="flex flex-col">
                    {camera.siteId ? (
                      <Link
                        href={`/sites/${camera.siteId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition hover:underline"
                        title="Mở trung tâm điều hành công trường này"
                      >
                        <Building2 className="h-3 w-3 text-primary shrink-0" />
                        <span>{camera.siteName || "Công trường chính"}</span>
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-foreground">
                        {camera.siteName || "Công trường chính"}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {camera.location || camera.zoneName || "Khu vực chung"}
                    </span>
                  </div>
                </td>

                {/* Source & Resolution */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="rounded bg-surface-elevated px-1.5 py-0.5">
                      {camera.sourceType}
                    </span>
                    <span className="text-muted-foreground">
                      {camera.config?.resolution || "1080p"}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isOnline
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isOnline ? "bg-emerald-500 animate-pulse" : "bg-danger"
                      }`}
                    />
                    {camera.status}
                  </span>
                </td>

                {/* Latency & FPS */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Wifi className="h-3.5 w-3.5 text-primary" />
                      {camera.currentLatencyMs || (isOnline ? 42 : 0)}ms
                    </span>
                    <span>•</span>
                    <span>{camera.currentFps || (isOnline ? 25 : 0)} FPS</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Xem sự cố của Camera */}
                    <Link
                      href={`/incidents?cameraId=${camera.id}&cameraCode=${camera.code}`}
                      title={`Xem danh sách các sự cố do ${camera.code} phát hiện`}
                      className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-500/10 transition"
                    >
                      <ShieldAlert className="h-4 w-4" />
                    </Link>

                    <Link
                      href={`/cameras/${camera.id}`}
                      title="Mở Camera AI Intelligence Studio"
                      className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition"
                    >
                      <Play className="h-4 w-4 fill-primary" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => onPing(camera)}
                      title={t("cameras.actions.ping")}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
                    >
                      <Activity className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onConfigureRoi(camera)}
                      title={t("cameras.actions.roi")}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
                    >
                      <Sliders className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(camera)}
                      title={t("cameras.actions.edit")}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(camera)}
                      title={t("cameras.actions.delete")}
                      className="rounded-lg p-1.5 text-danger/80 hover:bg-danger/10 hover:text-danger transition"
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
