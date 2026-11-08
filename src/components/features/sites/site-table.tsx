"use client";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh, TableRowActions } from "@/components/ui/table";
import type { TableProps } from "@/components/ui/table";

import { useRouter } from "next/navigation";

import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteTableProps {
  sites: SiteItem[];
  onManageZones: (site: SiteItem) => void;
  onSafetyConfig: (site: SiteItem) => void;
  onEdit: (site: SiteItem) => void;
  onDelete: (site: SiteItem) => void;
  onArchive?: (site: SiteItem) => void;
  loading?: boolean;
  tableState?: Partial<TableProps<SiteItem>>;
}

export function SiteTable({
  sites,
  onManageZones,
  onSafetyConfig,
  onEdit,
  onDelete,
  onArchive,
  loading = false,
  tableState,
}: SiteTableProps) {
  const router = useRouter();
  const can = useCan();
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  return (<Table
    data={sites}
    columns={[{
      id: "name",
      header: t("sites.table.name"),
      accessorFn: (site) => site.name,
      enableSorting: true,
      cell: ({ row }) => {
        const site = row.original;
        return <div className={""}>
          <div className="flex flex-col">
            <span className="font-bold text-foreground hover:text-primary transition-colors">
              {site.name}
            </span>
            <span className="font-mono text-xs text-primary">{site.code}</span>
          </div>
        </div>;
      }
    },
    {
      id: "address",
      header: t("sites.table.address"),
      accessorFn: (site) => site.address,
      enableSorting: false,
      cell: ({ row }) => {
        const site = row.original;
        return <div className={""}>
          <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
            {site.address || t("sites.card.noAddress")}
          </span>
        </div>;
      }
    },
    {
      id: "zoneCount",
      header: t("sites.table.zonesCount"),
      accessorFn: (site) => site.zoneCount,
      enableSorting: false,
      cell: ({ row }) => {
        const site = row.original;
        const zoneCount =
          site.zoneCount ?? site.zones?.length ?? site._count?.zones ?? 0;
        return <div className={""}>
          <span className="font-mono text-xs font-semibold text-foreground">
            {zoneCount} {t("sites.units.zones")}
          </span>
        </div>;
      }
    },
    {
      id: "restrictedAreaCount",
      header: t("sites.table.restrictedCount"),
      accessorFn: (site) => site.restrictedAreaCount,
      enableSorting: false,
      cell: ({ row }) => {
        const site = row.original;
        const restrictedCount =
          site.restrictedAreaCount ??
          site.restrictedAreas?.length ??
          site._count?.restrictedAreas ??
          0;
        return <div className={""}>
          <span className="font-mono text-xs font-semibold text-accent">
            {restrictedCount} {t("sites.units.restricted")}
          </span>
        </div>;
      }
    },
    {
      id: "status",
      header: t("sites.table.status"),
      accessorFn: (site) => site.status,
      enableSorting: true,
      cell: ({ row }) => {
        const site = row.original;
        const isActive = site.status === "ACTIVE";
        return <div className={""}>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${isActive
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted/40 text-muted-foreground border-border/40"
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/60"
                }`}
            />
            {isActive
              ? t("sites.status.active")
              : site.status === "INACTIVE"
                ? t("sites.status.inactive")
                : site.status === "COMPLETED"
                  ? t("sites.status.completed")
                  : site.status === "ARCHIVED"
                    ? t("sites.status.archived")
                    : t("sites.status.suspended")}
          </span>
        </div>;
      }
    },
    {
      id: "actions",
      header: t("sites.table.actions"),
      enableSorting: false,
      cell: ({ row }) => <TableRowActions row={row} actions={[
        {
          id: 'zones',
          label: t('sites.actions.manageZones'),
          hidden: !can('PPE_ZONE_READ'),
          onClick: onManageZones
        },
        {
          id: 'safety',
          label: t('sites.actions.safetyConfig'),
          hidden: !can('PPE_SAFETY_CONFIG_MANAGE'),
          onClick: onSafetyConfig
        },
        {
          id: 'edit',
          label: t('sites.actions.edit'),
          hidden: !can('PPE_SITE_MANAGE'),
          onClick: onEdit
        },
        {
          id: 'archive',
          label: isVietnamese ? 'Lưu trữ công trường' : 'Archive site',
          hidden: !onArchive || !can('PPE_SITE_MANAGE'),
          onClick: site => onArchive?.(site)
        },
        {
          id: 'delete',
          label: t('sites.actions.delete'),
          variant: 'danger',
          hidden: !can('PPE_SITE_MANAGE'),
          onClick: onDelete
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
    emptyMessage={t("sites.table.empty")}
    onRowClick={(row) => router.push(`/sites/${row.original.id}`)}
    {...tableState}
  >
    <TableToolbar showSearch={false} actions={<TableRefresh />} />
    <TableContent />
    <TablePagination />
  </Table>);
}
