"use client";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh } from "@/components/ui/table";

import { CheckCircle2, Layers, Plus, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelDto, AiModelVersionDto } from "@/types";
import { AiCardHelpButton } from "./ai-metrics-guide-modal";

export interface ModelGovernanceTableProps {
  models: AiModelDto[];
  onDeploy?: (modelId: string, version: AiModelVersionDto) => void;
  onAddVersion?: (modelId: string) => void;
  onRefresh?: () => void;
  onOpenGuide?: () => void;
  canDeploy?: boolean;
  canReadModels?: boolean;
  error?: boolean;
  loading?: boolean;
  fetching?: boolean;
}

export function ModelGovernanceTable({
  models,
  onDeploy,
  onAddVersion,
  onRefresh,
  onOpenGuide,
  canDeploy = true,
  canReadModels = true,
  error = false,
  loading = false,
  fetching = false,
}: ModelGovernanceTableProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";

  // Flatten versions from models
  const allVersions = models.flatMap((m) =>
    (m.versions || []).map((v) => ({
      ...v,
      modelName: m.name,
      modelCode: m.code,
      modelStatus: m.status,
    }))
  );

  const modelsWithoutVersions = models.filter(
    (m) => !m.versions || m.versions.length === 0
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
      case "STAGING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            {t("aiMetrics.governance.stagingBadge")}
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
        <div className="flex items-center gap-2.5">
          {canReadModels && (
            <span className="text-xs text-muted-foreground">
              {t("aiMetrics.governance.versionsRegistered", { count: allVersions.length })}
            </span>
          )}
          {onOpenGuide && <AiCardHelpButton onClick={onOpenGuide} />}
        </div>
      </div>

      {/* Registered models that do not have any versions yet */}
      {canReadModels && modelsWithoutVersions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/30 bg-surface-elevated/40 px-3 py-2.5 text-xs">
          <span className="font-semibold text-muted-foreground">
            {isVi
              ? `Mô hình chưa có phiên bản (${modelsWithoutVersions.length}):`
              : `Models without versions (${modelsWithoutVersions.length}):`}
          </span>
          {modelsWithoutVersions.map((m) => (
            <div
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-surface px-2.5 py-1 text-foreground"
            >
              <span className="font-semibold">{m.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                ({m.code})
              </span>
              {canDeploy && onAddVersion && (
                <button
                  type="button"
                  onClick={() => onAddVersion(m.id)}
                  className="ml-1 inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isVi ? "Thêm Version" : "Add Version"}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {!canReadModels && (
          <p className="py-5 text-center text-sm text-muted-foreground">{t("aiMetrics.modelReadRequired")}</p>
        )}
        {canReadModels && error && (
          <p role="alert" className="pb-3 text-sm">{t("aiMetrics.governance.loadError")}</p>
        )}
        {canReadModels && <Table
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
              const isModelInactive =
                v.modelStatus === "INACTIVE" || v.modelStatus === "DEPRECATED";
              const isVersionRetired =
                v.status === "DEPRECATED" ||
                v.status === "ARCHIVED" ||
                v.status === "RETIRED";
              const canDeployRow =
                !isActive && !isModelInactive && !isVersionRetired && canDeploy && Boolean(onDeploy);

              return <div className={"text-right"}>
                {canDeployRow && onDeploy ? (
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
                    {isActive
                      ? t("aiMetrics.governance.activeBadge")
                      : isModelInactive || isVersionRetired
                        ? locale === "vi-VN"
                          ? "Ngưng sử dụng"
                          : "Retired"
                        : locale === "vi-VN"
                          ? "Sẵn sàng"
                          : "Ready"}
                  </span>
                )}
              </div>;
            }
          }]}
          loading={loading}
          fetching={fetching}
          onRetry={onRefresh}
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
        </Table>}
      </div>
    </div>
  );
}
