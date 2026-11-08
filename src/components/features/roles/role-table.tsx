"use client";
import { useRouter } from "next/navigation";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh, TableRowActions } from "@/components/ui/table";
import type { TableProps } from "@/components/ui/table";

import { Key, Lock, Shield, Users } from "lucide-react";
import type { RoleDto } from "@/types";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";

export interface RoleTableProps {
  roles: RoleDto[];
  onConfigurePermissions: (role: RoleDto) => void;
  onEdit: (role: RoleDto) => void;
  onDelete: (role: RoleDto) => void;
  loading?: boolean;
  tableState?: Partial<TableProps<RoleDto>>;
}

export function RoleTable({
  roles,
  onConfigurePermissions,
  onEdit,
  onDelete,
  loading = false,
  tableState,
}: RoleTableProps) {
  const { t } = useLocale();
  const can = useCan();
  const router = useRouter();

  return (<Table
    data={roles}
    columns={[{
      id: "name",
      header: t("roles.table.roleName"),
      accessorFn: (role) => role.name,
      enableSorting: true,
      cell: ({ row }) => {
        const role = row.original;
        return <div className={""}>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <p className="font-bold text-foreground hover:text-primary transition-colors text-xs">{role.name}</p>
              <span className="font-mono text-[11px] text-primary">{role.name.toUpperCase()}</span>
            </div>
          </div>
        </div>;
      }
    },
    {
      id: "description",
      header: t("roles.table.description"),
      accessorFn: (role) => role.description,
      enableSorting: true,
      cell: ({ row }) => {
        const role = row.original;
        return <div className={"text-xs text-foreground/80 max-w-xs truncate"}>
          {t(`roles.desc.${role.name}`) !== `roles.desc.${role.name}`
            ? t(`roles.desc.${role.name}`)
            : role.description || "—"}
        </div>;
      }
    },
    {
      id: "permissions",
      header: t("roles.table.permsCount"),
      accessorFn: (role) => role.permissions?.length ?? 0,
      enableSorting: true,
      cell: ({ row }) => {
        const role = row.original;
        return <div className={""}>
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground">
            <Key className="h-3 w-3 text-primary" />
            {role.permissions?.length ?? 0}
          </span>
        </div>;
      }
    },
    {
      id: "userCount",
      header: t("roles.table.personnel"),
      accessorFn: (role) => role.userCount,
      enableSorting: true,
      cell: ({ row }) => {
        const role = row.original;
        return <div className={""}>
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground">
            <Users className="h-3 w-3 text-primary" />
            {role.userCount ?? 0}
          </span>
        </div>;
      }
    },
    {
      id: "isSystem",
      header: t("roles.table.type"),
      accessorFn: (role) => role.isSystem,
      enableSorting: true,
      cell: ({ row }) => {
        const role = row.original;
        return <div className={""}>
          {role.isSystem ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <Lock className="h-3 w-3 text-primary" />
              {t("roles.badge.system")}
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {t("roles.badge.custom")}
            </span>
          )}
        </div>;
      }
    },
    {
      id: "actions",
      header: t("roles.table.actions"),
      enableSorting: false,
      cell: ({ row }) => <TableRowActions row={row} actions={[
        {
          id: 'detail',
          label: t('roles.detail.detailBtn'),
          onClick: (role) => router.push(`/roles/${role.id}`)
        },
        {
          id: 'permissions',
          label: t('roles.actions.permissions'),
          hidden: !can('ROLE_PERMISSION_ASSIGN'),
          onClick: onConfigurePermissions
        },
        {
          id: 'edit',
          label: t('roles.actions.edit'),
          hidden: !can('ROLE_UPDATE'),
          onClick: onEdit
        },
        {
          id: 'delete',
          label: t('roles.actions.delete'),
          hidden: role => role.isSystem || !can('ROLE_DELETE'),
          variant: 'danger',
          onClick: onDelete
        }
      ]} />
    }]}
    loading={loading}
    getRowId={row => row.id}
    onRowClick={row => router.push(`/roles/${row.original.id}`)}
    features={{
      globalFilter: true,
      sorting: true,
      rowSelection: false,
      pagination: true
    }}
    emptyMessage={t("roles.empty.title")}
    {...tableState}
  >
    <TableToolbar showSearch={!tableState?.toolbar} actions={<TableRefresh />} />
    <TableContent />
    <TablePagination />
  </Table>);
}
