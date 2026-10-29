"use client";

import Link from "next/link";
import { Building2, Calendar, Camera, Clock, ExternalLink, MapPin, ShieldAlert } from "lucide-react";
import { IncidentStatusBadge } from "./incident-status-badge";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";

export interface IncidentMetaCardProps {
  incident: IncidentItem;
}

export function IncidentMetaCard({ incident }: IncidentMetaCardProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getZoneName, getCameraCode, getCameraName } = useEntityLookup();
  const siteName = incident.siteName || getSiteName(incident.siteId);
  const zoneName = incident.zoneName || getZoneName(incident.siteId, incident.zoneId);
  const cameraCode = incident.cameraCode || getCameraCode(incident.cameraId);
  const cameraName = incident.cameraName || getCameraName(incident.cameraId);

  const detectedDate = new Date(incident.detectedAt).toLocaleString(locale, {
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
          {isVietnamese ? "Thông tin Sự cố & Không gian" : "Incident & Spatial Metadata"}
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
            <span>{isVietnamese ? "Công trường" : "Construction Site"}</span>
          </span>
          {incident.siteId ? (
            <Link
              href={`/sites/${incident.siteId}`}
              className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition hover:underline"
              title={
                isVietnamese
                  ? `Mở trung tâm điều hành công trường ${siteName}`
                  : `Open operations center for site ${siteName}`
              }
            >
              <span>{siteName}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>
          ) : (
            <p className="font-semibold text-foreground">{siteName}</p>
          )}
        </div>

        {/* Zone */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <MapPin className="h-3.5 w-3.5 text-info" />
            <span>{isVietnamese ? "Phân khu thi công" : "Construction Zone"}</span>
          </span>
          <p className="font-semibold text-foreground">{zoneName}</p>
        </div>

        {/* Camera */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Camera className="h-3.5 w-3.5 text-primary" />
            <span>{isVietnamese ? "Camera giám sát" : "Surveillance Camera"}</span>
          </span>
          <Link
            href={`/cameras/${incident.cameraId}`}
            className="inline-flex items-center gap-1.5 font-mono font-bold text-primary hover:underline"
            title={
              isVietnamese
                ? `Mở Camera AI Studio: ${cameraName}`
                : `Open Camera AI Studio: ${cameraName}`
            }
          >
            <span>{cameraCode}</span>
            {cameraName && cameraName !== cameraCode && (
              <span className="font-sans text-xs font-normal text-muted-foreground">
                ({cameraName})
              </span>
            )}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Detected At */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>{isVietnamese ? "Thời điểm phát hiện" : "Detection Timestamp"}</span>
          </span>
          <p className="font-mono text-foreground">{detectedDate}</p>
        </div>
      </div>

      {/* Description */}
      {incident.description && (
        <div className="rounded-xl border border-border/30 bg-surface/50 p-3 text-xs">
          <span className="font-semibold text-muted-foreground block mb-1">
            {isVietnamese ? "Ghi chú chi tiết:" : "Detailed Notes:"}
          </span>
          <p className="text-foreground">{incident.description}</p>
        </div>
      )}
    </div>
  );
}
