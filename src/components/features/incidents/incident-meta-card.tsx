
"use client";

import Link from "next/link";
import {
  Building2,
  Camera,
  Clock,
  ExternalLink,
  MapPin,
} from "lucide-react";
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

  const {
    getSiteName,
    getZoneName,
    getCameraCode,
    getCameraName,
  } = useEntityLookup();

  const siteName = incident.siteName || getSiteName(incident.siteId);
  const zoneName =
    incident.zoneName || getZoneName(incident.siteId, incident.zoneId);
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

  const items = [
    {
      key: "site",
      icon: Building2,
      label: isVietnamese ? "Công trường" : "Construction Site",
      color: "text-primary",
      content: incident.siteId ? (
        <Link
          href={`/sites/${incident.siteId}`}
          title={
            isVietnamese
              ? `Mở trung tâm điều hành công trường ${siteName}`
              : `Open operations center for site ${siteName}`
          }
          className="group/link inline-flex min-w-0 items-center gap-1.5 font-bold text-foreground transition-colors hover:text-primary"
        >
          <span className="truncate">{siteName}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 group-hover/link:text-primary" />
        </Link>
      ) : (
        <p className="font-bold text-foreground">{siteName}</p>
      ),
    },
    {
      key: "zone",
      icon: MapPin,
      label: isVietnamese ? "Phân khu thi công" : "Construction Zone",
      color: "text-info",
      content: <p className="font-bold text-foreground">{zoneName}</p>,
    },

{
  key: "camera",
  icon: Camera,
  label: isVietnamese ? "Camera giám sát" : "Surveillance Camera",
  color: "text-primary",
  content: (
    <Link
      href={`/cameras/${incident.cameraId}`}
      title={
        isVietnamese
          ? `Mở Camera AI Studio: ${cameraName}`
          : `Open Camera AI Studio: ${cameraName}`
      }
      className="
        group/link flex min-w-0 max-w-full items-center gap-1.5
        font-mono font-bold text-primary transition-colors hover:underline
      "
    >
      <span className="shrink-0">{cameraCode}</span>

      {cameraName && cameraName !== cameraCode && (
        <span className="min-w-0 truncate font-sans text-xs font-medium text-muted-foreground">
          ({cameraName})
        </span>
      )}

      <ExternalLink className="h-3 w-3 shrink-0 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
    </Link>
  ),
},
    {
      key: "date",
      icon: Clock,
      label: isVietnamese ? "Thời điểm phát hiện" : "Detection Timestamp",
      color: "text-amber-500",
      content: (
        <p className="font-mono text-[11px] font-semibold leading-relaxed text-foreground">
          {detectedDate}
        </p>
      ),
    },
  ];

  return (
    <section
      className="
        relative space-y-4 overflow-hidden rounded-2xl
        border border-border/40 bg-surface p-4 sm:p-5
        shadow-[5px_5px_12px_rgba(0,0,0,0.07),-5px_-5px_12px_rgba(255,255,255,0.65)]
        dark:shadow-[5px_5px_12px_rgba(0,0,0,0.22),-4px_-4px_10px_rgba(255,255,255,0.025)]
      "
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="
              flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
              border border-border/30 bg-surface
              shadow-[3px_3px_6px_rgba(0,0,0,0.09),-3px_-3px_6px_rgba(255,255,255,0.65)]
              dark:shadow-[3px_3px_6px_rgba(0,0,0,0.22),-2px_-2px_5px_rgba(255,255,255,0.025)]
            "
          >
            <Building2 className="h-4 w-4 text-primary" />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-extrabold tracking-tight text-foreground">
              {isVietnamese
                ? "Thông tin Sự cố & Không gian"
                : "Incident & Spatial Metadata"}
            </h4>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
              {isVietnamese
                ? "THÔNG TIN ĐỊNH DANH & VỊ TRÍ"
                : "IDENTIFICATION & LOCATION"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IncidentSeverityBadge severity={incident.severity} />
          <IncidentStatusBadge status={incident.status} />
        </div>
      </div>

      {/* Decorative recessed divider */}
      <div className="h-[2px] rounded-full bg-border/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]" />

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="
                group relative min-w-0 rounded-xl
                border border-border/25 bg-surface/60 p-3.5
                shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.65)]
                transition-all duration-200
                hover:-translate-y-[1px]
                hover:shadow-[4px_4px_9px_rgba(0,0,0,0.09),-4px_-4px_9px_rgba(255,255,255,0.7)]
                dark:shadow-[3px_3px_7px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(255,255,255,0.025)]
                dark:hover:shadow-[4px_4px_9px_rgba(0,0,0,0.25),-3px_-3px_7px_rgba(255,255,255,0.035)]
              "
            >
              <div className="flex items-center gap-2">
                {/* Icon recessed well */}
                <div
                  className="
                    flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                    border border-border/20 bg-surface/70
                    shadow-[inset_2px_2px_4px_rgba(0,0,0,0.09),inset_-2px_-2px_4px_rgba(255,255,255,0.65)]
                    dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.22),inset_-2px_-2px_4px_rgba(255,255,255,0.025)]
                  "
                >
                  <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                  {item.label}
                </span>
              </div>

              {/* Value */}
              <div className="mt-3 min-h-[20px] min-w-0 overflow-hidden pl-1 text-xs">
                {item.content}
              </div>

              {/* Bottom sculpted accent */}
              <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
            </div>
          );
        })}
      </div>

      {/* Description */}
      {incident.description && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_4px_rgba(0,0,0,0.2)]" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
              {isVietnamese ? "Ghi chú chi tiết" : "Detailed Notes"}
            </span>
          </div>

          <div
            className="
              relative overflow-hidden rounded-xl
              border border-border/30 bg-surface/50 p-3.5
              shadow-[inset_3px_3px_7px_rgba(0,0,0,0.09),inset_-3px_-3px_7px_rgba(255,255,255,0.65)]
              dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.25),inset_-2px_-2px_6px_rgba(255,255,255,0.025)]
            "
          >
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
              {incident.description}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
