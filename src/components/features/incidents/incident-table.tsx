"use client";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh, TableRowActions } from "@/components/ui/table";
import type { TableProps } from "@/components/ui/table";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { IncidentStatusBadge } from "./incident-status-badge";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { EVIDENCE_TYPE, type IncidentItem } from "@/types";
import { resolveEvidenceUrl } from "@/lib/evidence-url";

export interface IncidentTableProps {
  incidents: IncidentItem[];
  onReview?: (incident: IncidentItem) => void;
  onResolve?: (incident: IncidentItem) => void;
  onAssign?: (incident: IncidentItem) => void;
  onDelete?: (incident: IncidentItem) => void;
  onFilterSite?: (siteId: string) => void;
  loading?: boolean;
  tableState?: Partial<TableProps<IncidentItem>>;
  highlightedId?: string | null;
}

export function getIncidentEvidenceUrl(incident: IncidentItem): string {
  if (typeof window !== "undefined") {
    const cachedByIncident = sessionStorage.getItem(`ppe_incident_evidence_${incident.id}`);
    if (cachedByIncident) return resolveEvidenceUrl(cachedByIncident);
    if (incident.cameraId) {
      const cachedByCamera = sessionStorage.getItem(`ppe_camera_evidence_${incident.cameraId}`);
      if (cachedByCamera) return resolveEvidenceUrl(cachedByCamera);
    }
  }
  if (incident.snapshotUrl) return resolveEvidenceUrl(incident.snapshotUrl);
  const ev =
    incident.evidences?.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ||
    incident.evidences?.[0];
  if (ev?.url) return resolveEvidenceUrl(ev.url);
  if (ev?.storageKey) {
    return resolveEvidenceUrl(ev.storageKey);
  }
  return "";
}

export function IncidentTable({
  incidents,
  onReview,
  onResolve,
  onAssign,
  onDelete,
  onFilterSite,
  loading = false,
  tableState,
  highlightedId,
}: IncidentTableProps) {
  const { t, locale } = useLocale();
  const can = useCan();
  const router = useRouter();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getCameraCode, getCameraName } = useEntityLookup();

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

  return (<Table
    data={incidents}
    columns={[{
      id: "id",
      header: t("incidents.table.incident"),
      accessorFn: (incident) => incident.id,
      enableSorting: false,
      cell: ({ row }) => {
        const incident = row.original;
        return <div className={""}>
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-950/80 border border-border/40">
              <img
                src={getIncidentEvidenceUrl(incident)}
                alt="Evidence"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes("/images/camera-live-evidence.jpg")) {
                    target.src = "/images/camera-live-evidence.jpg";
                  } else {
                    target.style.display = "none";
                  }
                }}
              />
            </div>
            <div>
              <Link
                href={`/incidents/${incident.id}`}
                className="font-mono text-xs font-bold text-primary hover:underline line-clamp-1"
              >
                #{incident.id.slice(0, 8)}
              </Link>
              <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                {incident.description || formatViolation(incident.violationType)}
              </p>
            </div>
          </div>
        </div>;
      }
    },
    {
      id: "violationType",
      header: t("incidents.table.violation"),
      accessorFn: (incident) => incident.violationType,
      enableSorting: false,
      cell: ({ row }) => {
        const incident = row.original;
        return <div className={""}>
          <span className="font-semibold text-xs text-foreground">
            {formatViolation(incident.violationType)}
          </span>
        </div>;
      }
    },
    {
      id: "severity",
      header: t("incidents.table.severity"),
      accessorFn: (incident) => incident.severity,
      enableSorting: true,
      cell: ({ row }) => {
        const incident = row.original;
        return <div className={""}>
          <IncidentSeverityBadge severity={incident.severity} />
        </div>;
      }
    },
    {
      id: "siteId",
      header: t("incidents.table.location"),
      accessorFn: (incident) => incident.siteId,
      enableSorting: false,
      cell: ({ row }) => {
        const incident = row.original;
        return <div className={""}>
          {(() => {
            const siteName = incident.siteName || getSiteName(incident.siteId);
            const cameraCode = incident.cameraCode || getCameraCode(incident.cameraId);
            const cameraName = incident.cameraName || getCameraName(incident.cameraId);
            return (
              <div className="flex flex-col gap-0.5 text-xs">
                {incident.siteId ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFilterSite?.(incident.siteId)}
                      className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition hover:underline text-left"
                      title={
                        isVietnamese
                          ? `Lọc danh sách theo công trường ${siteName}`
                          : `Filter by site ${siteName}`
                      }
                    >
                      <span className="line-clamp-1 max-w-[160px]">{siteName}</span>
                    </button>
                    <Link
                      href={`/sites/${incident.siteId}`}
                      className="text-muted-foreground hover:text-primary transition p-0.5"
                      title={
                        isVietnamese
                          ? `Mở trang chi tiết công trường ${siteName}`
                          : `Open site detail page ${siteName}`
                      }
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <span className="font-medium text-foreground line-clamp-1 max-w-[180px]">
                    {siteName}
                  </span>
                )}
                <Link
                  href={
                    incident.cameraId
                      ? `/cameras/${incident.cameraId}`
                      : `/cameras?search=${cameraCode}&view=wall`
                  }
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary transition hover:underline"
                  title={
                    isVietnamese
                      ? `Mở Camera AI Studio: ${cameraName}`
                      : `Open Camera AI Studio: ${cameraName}`
                  }
                >
                  <span className="font-bold text-primary/90">{cameraCode}</span>
                  {cameraName && cameraName !== cameraCode && (
                    <span className="text-muted-foreground truncate max-w-[120px]">
                      ({cameraName})
                    </span>
                  )}
                </Link>
              </div>
            );
          })()}
        </div>;
      }
    },
    {
      id: "detectedAt",
      header: t("incidents.table.detectedAt"),
      accessorFn: (incident) => incident.detectedAt,
      enableSorting: true,
      cell: ({ row }) => {
        const incident = row.original;
        const dateStr = new Date(incident.detectedAt).toLocaleString("vi-VN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        return <div className={""}>
          <span className="font-mono text-xs text-muted-foreground">
            {dateStr}
          </span>
        </div>;
      }
    },
    {
      id: "status",
      header: t("incidents.table.status"),
      accessorFn: (incident) => incident.status,
      enableSorting: true,
      cell: ({ row }) => {
        const incident = row.original;
        return <div className={""}>
          <IncidentStatusBadge status={incident.status} />
        </div>;
      }
    },
    {
      id: "actions",
      header: t("incidents.table.actions"),
      enableSorting: false,
      cell: ({ row }) => <TableRowActions row={row} actions={[
        {
          id: 'detail',
          label: t('incidents.actions.viewDetail'),
          onClick: incident => router.push('/incidents/' + incident.id)
        },
        {
          id: 'camera',
          label: isVietnamese ? 'Mở Video Wall' : 'Open Video Wall',
          onClick: incident => router.push('/cameras?search=' + encodeURIComponent(incident.cameraCode || incident.cameraId) + '&view=wall')
        },
        {
          id: 'review',
          label: t('incidents.actions.review'),
          hidden: incident => !onReview || incident.status !== 'PENDING_REVIEW' || !can('PPE_INCIDENT_REVIEW'),
          onClick: incident => onReview?.(incident)
        },
        {
          id: 'assign',
          label: t('incidents.actions.assign'),
          hidden: incident => !onAssign || incident.status !== 'CONFIRMED' || !can('PPE_INCIDENT_MANAGE'),
          onClick: incident => onAssign?.(incident)
        },
        {
          id: 'resolve',
          label: t('incidents.actions.resolve'),
          hidden: incident => !onResolve || incident.status !== 'CONFIRMED' || !can('PPE_INCIDENT_UPDATE'),
          onClick: incident => onResolve?.(incident)
        },
        {
          id: 'delete',
          label: t('incidents.actions.delete'),
          hidden: !onDelete || !can('PPE_INCIDENT_DELETE'),
          variant: 'danger',
          onClick: incident => onDelete?.(incident)
        }
      ]} />
    }]}
    loading={loading}
    getRowId={row => row.id}
    features={{
      globalFilter: false,
      sorting: false,
      rowSelection: false,
      pagination: true
    }}
    manualFiltering
    manualSorting
    manualPagination
    emptyMessage={t("incidents.table.empty")}
    getRowClassName={incident => incident.id === highlightedId ? "bg-danger/10 ring-2 ring-inset ring-danger/40" : ""}
    {...tableState}
  >
    <TableToolbar showSearch={false} actions={<TableRefresh />} />
    <TableContent />
    <TablePagination />
  </Table>);
}
