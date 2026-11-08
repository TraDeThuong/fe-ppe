"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  Activity,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Server,
  XCircle,
} from "lucide-react";
import {
  Table,
  TableContent,
  TableToolbar,
  type TableFeatureSet,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { ServiceHealthItem, SystemHealthReport } from "@/types";

export interface SystemHealthMatrixProps {
  healthReport?: SystemHealthReport;
  onRefresh: () => void;
  isRefreshing?: boolean;
  variant?: "soft" | "sculpted";
}

export function SystemHealthMatrix({
  healthReport,
  onRefresh,
  isRefreshing = false,
  variant = "soft",
}: SystemHealthMatrixProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const rawServices = healthReport?.services ?? [];

  // Filter states
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SERVICE" | "INFRASTRUCTURE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "HEALTHY" | "DEGRADED" | "DOWN">("ALL");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "status", desc: false },
  ]);

  const filteredServices = useMemo(() => {
    const list = rawServices.filter((svc) => {
      const matchesType = typeFilter === "ALL" || (svc.type || "SERVICE") === typeFilter;
      const matchesStatus = statusFilter === "ALL" || svc.status === statusFilter;
      const matchesSearch =
        !search.trim() ||
        svc.name.toLowerCase().includes(search.toLowerCase()) ||
        svc.serviceCode.toLowerCase().includes(search.toLowerCase()) ||
        String(svc.port).includes(search);

      return matchesType && matchesStatus && matchesSearch;
    });


    return list;
  }, [rawServices, typeFilter, statusFilter, search]);

  const getStatusBadge = (status: "HEALTHY" | "DEGRADED" | "DOWN") => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success shadow-[0_0_8px_rgba(34,197,94,0.15)]">
            <CheckCircle2 className="h-3 w-3" />
            {t("system.health.statusHealthy")}
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
            <Clock className="h-3 w-3" />
            {t("system.health.statusDegraded")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">
            <XCircle className="h-3 w-3" />
            {t("system.health.statusDown")}
          </span>
        );
    }
  };

  const columns = useMemo<ColumnDef<TableFeatureSet, ServiceHealthItem, any>[]>(() => {
    return [
      {
        id: "name",
        accessorKey: "name",
        header: t("system.health.tableService"),
        cell: ({ row }) => {
          const svc = row.original;
          return (
            <div className="flex items-center gap-2.5 py-1">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${svc.status === "HEALTHY"
                    ? "bg-success animate-pulse"
                    : svc.status === "DEGRADED"
                      ? "bg-warning"
                      : "bg-danger"
                  }`}
              />
              <span className="font-semibold text-foreground text-xs sm:text-sm">
                {svc.name}
              </span>
            </div>
          );
        },

      },
      {
        id: "type",
        accessorKey: "type",
        header: t("system.health.category"),
        cell: ({ row }) => {
          const isInfra = row.original.type === "INFRASTRUCTURE";
          return (
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${isInfra
                  ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}
            >
              {isInfra ? t("system.health.typeInfra") : t("system.health.typeService")}
            </span>
          );
        },

      },
      {
        id: "serviceCode",
        accessorKey: "serviceCode",
        header: t("system.health.tableCode"),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.serviceCode}
          </span>
        ),

      },
      {
        id: "port",
        accessorKey: "port",
        header: t("system.health.tablePort"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            :{row.original.port}
          </span>
        ),

      },
      {
        id: "status",
        accessorKey: "status",
        sortFn: (left, right) => {
          const rank = { HEALTHY: 1, DEGRADED: 2, DOWN: 3 };
          return rank[left.original.status] - rank[right.original.status];
        },
        header: t("system.health.tableStatus"),
        cell: ({ row }) => getStatusBadge(row.original.status),

      },
      {
        id: "latencyMs",
        accessorKey: "latencyMs",
        header: t("system.health.tableLatency"),
        cell: ({ row }) => {
          const lat = row.original.latencyMs;
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <Activity
                className={`h-3.5 w-3.5 ${lat < 100
                    ? "text-success"
                    : lat < 300
                      ? "text-warning"
                      : "text-danger"
                  }`}
              />
              <span
                className={
                  lat < 100
                    ? "text-foreground font-semibold"
                    : lat < 300
                      ? "text-warning font-semibold"
                      : "text-danger font-semibold"
                }
              >
                {lat} ms
              </span>
            </div>
          );
        },

      },
      {
        id: "uptime",
        accessorKey: "uptime",
        header: t("system.health.tableUptime"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.uptime ?? "14d 8h"}
          </span>
        ),

      },
    ];
  }, [t]);

  return (
    <div className="space-y-4">
      {/* Header & Diagnostics Control */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15">
            <Server className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {t("system.health.title")}
            </h3>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {t("system.health.description")}
            </p>
          </div>
        </div>

        <Button

          variant="outline"

          size="sm"

          onClick={onRefresh}

          disabled={isRefreshing}

          className="flex items-center gap-1.5 rounded-xl self-start sm:self-auto text-xs"

        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{t("system.refresh")}</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input

            type="text"

            value={search}

            onChange={(e) => setSearch(e.target.value)}

            placeholder={isVietnamese ? "Tìm kiếm node dịch vụ hoặc cổng..." : "Search service node or port..."}

            className="w-full rounded-xl border border-border/40 bg-surface pl-9 pr-3 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:border-black/50 dark:bg-card/70"

          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <Button

            type="button"

            variant={typeFilter === "ALL" ? "primary" : "outline"}

            size="sm"

            onClick={() => setTypeFilter("ALL")}

            className="h-8 text-xs rounded-xl px-2.5"

          >
            {t("system.health.filterAll", { count: rawServices.length })}
          </Button>
          <Button

            type="button"

            variant={typeFilter === "SERVICE" ? "primary" : "outline"}

            size="sm"

            onClick={() => setTypeFilter("SERVICE")}

            className="h-8 text-xs rounded-xl px-2.5"

          >
            {t("system.health.filterServices", {
              count: rawServices.filter((s) => (s.type || "SERVICE") === "SERVICE").length,
            })}
          </Button>
          <Button

            type="button"

            variant={typeFilter === "INFRASTRUCTURE" ? "primary" : "outline"}

            size="sm"

            onClick={() => setTypeFilter("INFRASTRUCTURE")}

            className="h-8 text-xs rounded-xl px-2.5"

          >
            {t("system.health.filterInfra", {
              count: rawServices.filter((s) => s.type === "INFRASTRUCTURE").length,
            })}
          </Button>
        </div>
      </div>

      {/* Common Table Component */}
      <Table

        surface="embedded"

        fetching={isRefreshing}

        onRetry={onRefresh}

        data={filteredServices}

        features={{
          pagination: false,
          globalFilter: false,
          rowSelection: false
        }}

        columns={columns}

        variant={variant}

        sorting={sorting}

        onSortingChange={setSorting}

        emptyMessage={t("system.health.noServices")}

        getRowId={(row) => row.serviceCode}

      >
        <TableToolbar showSearch={false} />
        <TableContent />
      </Table>
    </div>
  );
}
