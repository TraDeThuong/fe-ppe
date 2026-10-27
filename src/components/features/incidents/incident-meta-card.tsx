"use client";

import { Building2, Calendar, Camera, Clock, MapPin, ShieldAlert } from "lucide-react";
import { IncidentStatusBadge } from "./incident-status-badge";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import type { IncidentItem } from "@/types";

export interface IncidentMetaCardProps {
  incident: IncidentItem;
}

export function IncidentMetaCard({ incident }: IncidentMetaCardProps) {
  const detectedDate = new Date(incident.detectedAt).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <h4 className="font-bold text-sm text-foreground">
          Thông tin Sự cố & Không gian
        </h4>
        <div className="flex items-center gap-2">
          <IncidentSeverityBadge severity={incident.severity} />
          <IncidentStatusBadge status={incident.status} />
        </div>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 text-xs">
        {/* Site */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>Công trường</span>
          </span>
          <p className="font-semibold text-foreground">
            {incident.siteName || "Công trường xây dựng"}
          </p>
        </div>

        {/* Zone */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <MapPin className="h-3.5 w-3.5 text-info" />
            <span>Phân khu thi công</span>
          </span>
          <p className="font-semibold text-foreground">
            {incident.zoneName || "Khu vực chung"}
          </p>
        </div>

        {/* Camera */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Camera className="h-3.5 w-3.5 text-primary" />
            <span>Camera giám sát</span>
          </span>
          <p className="font-mono font-bold text-primary">
            {incident.cameraCode || incident.cameraId.slice(0, 8)}
          </p>
        </div>

        {/* Detected At */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>Thời điểm phát hiện</span>
          </span>
          <p className="font-mono text-foreground">{detectedDate}</p>
        </div>
      </div>

      {/* Description */}
      {incident.description && (
        <div className="rounded-xl border border-border/30 bg-surface/50 p-3 text-xs">
          <span className="font-semibold text-muted-foreground block mb-1">
            Ghi chú chi tiết:
          </span>
          <p className="text-foreground">{incident.description}</p>
        </div>
      )}
    </div>
  );
}
