"use client";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh } from "@/components/ui/table";

import { CheckCircle2, Layers, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelDto, AiModelVersionDto } from "@/types";

export interface ModelGovernanceTableProps {
  models: AiModelDto[];
  onDeploy?: (modelId: string, version: AiModelVersionDto) => void;
  canDeploy?: boolean;
  loading?: boolean;
}

export function ModelGovernanceTable({
  models,
  onDeploy,
  canDeploy = true,
  loading = false,
}: ModelGovernanceTableProps) {
  const { t, locale } = useLocale();

  // Flatten versions from models
  const allVersions = models.flatMap((m) =>
    (m.versions || []).map((v) => ({
      ...v,
      modelName: m.name,
      modelCode: m.code
    }))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DEPLOYED":
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            {t("aiMetrics.governance.activeBadge")}
          </span>
        );
      case "DEVELOPMENT":
      case "CANDIDATE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {t("aiMetrics.governance.candidateBadge")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {t("aiMetrics.governance.archivedBadge")}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t("aiMetrics.governance.title")}
          </h4>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("aiMetrics.governance.versionsRegistered", { count: allVersions.length })}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table
          surface="embedded"
          data={allVersions}
          columns={[{
            id: "version",
            header: t("aiMetrics.governance.version"),
            accessorFn: (v) => v.version,
            enableSorting: true,
            cell: ({ row }) => {
              const v = row.original;
              return <div className={""}>
                <div className="font-bold text-foreground">{v.version}</div>
                <div className="text-[11px] text-muted-foreground">
                  {v.modelName}
                  {v.modelPath ? ` · ${v.modelPath}` : ""}
                </div>
              </div>;
            }
          },
          {
            id: "framework",
            header: t("aiMetrics.governance.framework"),
            accessorFn: (v) => v.framework,
            enableSorting: true,
            cell: ({ row }) => {
              const v = row.original;
              return <div className={""}>
                <span className="font-medium text-foreground">{v.framework}</span>
                <span className="text-muted-foreground text-[11px] block">{v.inputSize}</span>
              </div>;
            }
          },
          {
            id: "metrics",
            header: t("aiMetrics.governance.map"),
            accessorFn: (v) => v.metrics?.mAP50,
            enableSorting: true,
            cell: ({ row }) => {
              const v = row.original;
              const map50 =
                typeof v.metrics?.mAP50 === "number"
                  ? `${(v.metrics.mAP50 * 100).toFixed(1)}%`
                  : "--";
              return <div className={"font-bold text-primary"}>{map50}</div>;
            }
          },
          {
            id: "latency",
            header: t("aiMetrics.governance.latency"),
            accessorFn: (v) => v.metrics?.latencyMs,
            enableSorting: true,
            cell: ({ row }) => {
              const v = row.original;
              const latency =
                typeof v.metrics?.latencyMs === "number"
                  ? `${v.metrics.latencyMs.toFixed(1)} ms`
                  : "--";
              return <div className={"font-medium text-foreground"}>{latency}</div>;
            }
          },
          {
            id: "createdAt",
            header: t("aiMetrics.governance.createdAt"),
            accessorFn: (v) => v.createdAt,
            enableSorting: true,
            cell: ({ row }) => {
              const v = row.original;
              const date = new Date(v.createdAt).toLocaleDateString(locale === "vi-VN" ? "vi-VN" : "en-US");
              return <div className={"text-muted-foreground"}>{date}</div>;
            }
          },
          {
            id: "status",
            header: t("aiMetrics.governance.status"),
            accessorFn: (v) => v.status,
            enableSorting: true,
            cell: ({ row }) => {
              const v = row.original;
              return <div className={""}>{getStatusBadge(v.status)}</div>;
            }
          },
          {
            id: "actions",
            header: t("aiMetrics.governance.actions"),
            enableSorting: false,
            cell: ({ row }) => {
              const v = row.original;
              const isActive = v.status === "DEPLOYED" || v.status === "ACTIVE";
              return <div className={"text-right"}>
                {!isActive && canDeploy && onDeploy ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onDeploy(v.modelId, v)}
                    className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    <span>{t("aiMetrics.governance.deployBtn")}</span>
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs italic">
                    {isActive ? "Đang chạy" : "Sẵn sàng"}
                  </span>
                )}
              </div>;
            }
          }]}
          loading={loading}
          getRowId={row => row.id}
          features={{
            globalFilter: true,
            sorting: true,
            rowSelection: false,
            pagination: true
          }}
        >
          <TableToolbar showSearch={true} actions={<TableRefresh />} />
          <TableContent />
          <TablePagination />
        </Table>
      </div>
    </div>
  );
}
