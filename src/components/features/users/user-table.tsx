"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ColumnDef, PaginationState, RowSelectionState, SortingState } from "@tanstack/react-table";
import { Shield, ShieldCheck, ShieldAlert, Pencil, Trash2, RotateCcw, UserPlus, Lock, Unlock, Building2, ExternalLink, LayoutGrid, Table2 } from "lucide-react";

import { Table, TableToolbar, TableContent, TablePagination, TableSelectionHeader, TableSelectionRow, TableRowActions, type TableFeatureSet, type TableRowAction, type TableBulkAction, TableBulkActions, TableFilterPanel } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshIconButton } from "@/components/ui/refresh-action";
import { PhoneReveal } from "@/components/ui/phone-reveal";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import { useUsers } from "@/hooks/users";
import { useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { userKeys } from "@/hooks/users/user.query-keys";
import { mapTableSort, settleInBatches } from "@/lib/table-utils";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useRolesCatalog as useRoles } from "@/hooks/rbac";
import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { UserResponseDto } from "@/types";

import { CreateUserModal, EditUserModal, AssignUserRoleModal, ConfirmUserDeleteModal } from "./modals";
import { UserRoleFilterBar } from "./user-role-filter-bar";
import { UserCardGrid, type UserCardSortOption } from "./user-card-grid";
import { getRoleBadgeStyle, getUserAccountStatus, getUserInitials } from "./user-presentation";

export type UserViewMode = "table" | "card";

const USER_VIEW_MODE_STORAGE_KEY = "ppe.users.view-mode.v1";

export interface UserTableProps {
  className?: string;
  variant?: "soft" | "sculpted";
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  isCreateOpen?: boolean;
  onOpenCreateChange?: (open: boolean) => void;
  summaryTotal?: number;
  roleCounts?: Record<string, number>;
  defaultViewMode?: UserViewMode;
}

export function UserTable({
  className = "",
  variant = "soft",
  statusFilter: propStatusFilter,
  onStatusFilterChange,
  isCreateOpen: propIsCreateOpen,
  onOpenCreateChange,
  summaryTotal,
  roleCounts,
  defaultViewMode,
}: UserTableProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: currentAdmin } = useAuth();
  const can = useCan();
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles({
    enabled: can("ROLE_READ"),
  });
  const queryClient = useQueryClient();
  const canUpdate = can("USER_UPDATE");
  const canCreate = can("USER_CREATE");
  const canAssignRole = can("USER_ROLE_ASSIGN");
  const canDelete = can("USER_DELETE");
  const canRestore = can("USER_RESTORE") || canDelete;
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkMode, setBulkMode] = useState<boolean | null>(null);

  const urlView = searchParams.get("view");
  const urlRole = searchParams.get("role");

  const [viewMode, setViewMode] = useState<UserViewMode>(() => {
    if (urlView === "card" || urlView === "table") return urlView;
    return defaultViewMode ?? "table";
  });
  const [viewModeHydrated, setViewModeHydrated] = useState(
    Boolean(defaultViewMode || urlView === "card" || urlView === "table"),
  );

  // Restore saved view mode preference from localStorage (chỉ khi URL và props không chỉ định)
  useEffect(() => {
    if (defaultViewMode || urlView === "card" || urlView === "table") {
      setViewModeHydrated(true);
      return;
    }
    try {
      const saved = localStorage.getItem(USER_VIEW_MODE_STORAGE_KEY);
      if (saved === "card" || saved === "table") {
        setViewMode(saved);
      }
    } catch {
      // Ignore storage errors
    } finally {
      setViewModeHydrated(true);
    }
  }, [defaultViewMode, urlView]);

  // Sync viewMode khi URL ?view= thay đổi (Back / Forward)
  useEffect(() => {
    if (urlView === "card" || urlView === "table") {
      setViewMode((prev) => (prev === urlView ? prev : urlView));
    }
  }, [urlView]);

  // Persist viewMode vào localStorage sau khi hydrate
  useEffect(() => {
    if (!viewModeHydrated || defaultViewMode) return;
    try {
      localStorage.setItem(USER_VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // Ignore storage quota errors
    }
  }, [viewModeHydrated, viewMode, defaultViewMode]);

  // Query States (hỗ trợ deep-link ?search=...&role=...)
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const debouncedSearch = useDebounce(search, 350);

  const [roleFilter, setRoleFilter] = useState<string>(
    () => urlRole || "all",
  );

  useEffect(() => {
    const nextRole = urlRole || "all";
    setRoleFilter((prev) => (prev === nextRole ? prev : nextRole));
  }, [urlRole]);

  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all");
  const statusFilter = propStatusFilter !== undefined ? propStatusFilter : internalStatusFilter;
  const setStatusFilter = (val: string) => {
    setInternalStatusFilter(val);
    onStatusFilterChange?.(val);
  };

  // Table internal states
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const updateUrlParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      if (!pathname) return;
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleViewModeChange = useCallback(
    (nextMode: UserViewMode) => {
      setViewMode(nextMode);
      if (nextMode === "card") {
        setRowSelection({});
      }
      updateUrlParams((params) => {
        if (nextMode === "table") {
          params.delete("view");
        } else {
          params.set("view", nextMode);
        }
      });
    },
    [updateUrlParams],
  );

  const handleRoleFilterChange = useCallback(
    (nextRole: string) => {
      setRoleFilter(nextRole);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      updateUrlParams((params) => {
        if (!nextRole || nextRole === "all") {
          params.delete("role");
        } else {
          params.set("role", nextRole);
        }
      });
    },
    [updateUrlParams],
  );

  const apiSorting = mapTableSort(sorting, { user: "fullName", email: "email", createdAt: "createdAt" }, { sortBy: "createdAt", order: "desc" });

  // Fetch Users (lọc server-side theo roleName, isActive, isLocked, isDeleted, twoFactorEnabled)
  const queryParams = useMemo(() => {
    return {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: debouncedSearch.trim() || undefined,
      roleName: roleFilter !== "all" ? roleFilter : undefined,
      isActive: statusFilter === "active" ? true : undefined,
      isLocked:
        statusFilter === "inactive" || statusFilter === "locked"
          ? true
          : statusFilter === "active"
            ? false
            : undefined,
      isDeleted: statusFilter === "deleted" ? true : undefined,
      twoFactorEnabled: statusFilter === "twoFactor" ? true : undefined,
      sortBy: apiSorting.sortBy,
      order: apiSorting.order,
    };
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, roleFilter, statusFilter, apiSorting.sortBy, apiSorting.order]);

  const {
    data: usersData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useUsers(queryParams);

  // Modal states
  const [internalIsCreateOpen, setInternalIsCreateOpen] = useState(false);
  const isCreateOpen = propIsCreateOpen !== undefined ? propIsCreateOpen : internalIsCreateOpen;
  const setIsCreateOpen = (val: boolean) => {
    setInternalIsCreateOpen(val);
    onOpenCreateChange?.(val);
  };
  const [editUser, setEditUser] = useState<UserResponseDto | null>(null);
  const [assignRoleUser, setAssignRoleUser] = useState<UserResponseDto | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{
    user: UserResponseDto | null;
    mode: "delete" | "restore" | "activate" | "deactivate";
    open: boolean;
  }>({
    user: null,
    mode: "delete",
    open: false,

  });

  const tableData = usersData?.data ?? [];
  const totalCount = usersData?.meta?.total ?? tableData.length;
  const pageCount =
    usersData?.meta?.totalPages ?? Math.ceil(totalCount / pagination.pageSize);

  const cardSortValue = useMemo<UserCardSortOption>(() => {
    const active = sorting[0];
    if (active?.id === "user") return "fullName:asc";
    if (active?.id === "email") return "email:asc";
    if (active?.id === "createdAt" && !active.desc) return "createdAt:asc";
    return "createdAt:desc";
  }, [sorting]);

  const handleCardSortChange = useCallback((nextSort: UserCardSortOption) => {
    switch (nextSort) {
      case "createdAt:asc":
        setSorting([{ id: "createdAt", desc: false }]);
        break;
      case "fullName:asc":
        setSorting([{ id: "user", desc: false }]);
        break;
      case "email:asc":
        setSorting([{ id: "email", desc: false }]);
        break;
      case "createdAt:desc":
      default:
        setSorting([{ id: "createdAt", desc: true }]);
        break;
    }
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const viewModeOptions = useMemo<SegmentedControlOption<UserViewMode>[]>(
    () => [
      {
        value: "table",
        label: t("users.view.table"),
        icon: <Table2 className="size-3.5" aria-hidden="true" />,
      },
      {
        value: "card",
        label: t("users.view.card"),
        icon: <LayoutGrid className="size-3.5" aria-hidden="true" />,
      },
    ],
    [t],
  );

  const hasActiveFilters =
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    Boolean(debouncedSearch);

  const handleResetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    updateUrlParams((params) => {
      params.delete("role");
      params.delete("search");
    });
  };

  // Row Actions definition
  const getRowActions = useCallback(
    (rowUser: UserResponseDto): TableRowAction<UserResponseDto>[] => {
      const isSelf = Boolean(currentAdmin?.id && rowUser.id === currentAdmin.id);
      const isDeleted = Boolean(rowUser.deletedAt);

      const actions: TableRowAction<UserResponseDto>[] = [
        {
          id: "view-profile",
          label: isVietnamese ? "Xem trang hồ sơ" : "View Profile Page",
          icon: <ExternalLink size={14} />,
          onClick: (u) => router.push(`/users/${u.id}`),
        },
        {
          hidden: !canUpdate || isDeleted,
          id: "edit",
          label: isVietnamese ? "Chỉnh sửa thông tin" : "Edit Profile",
          icon: <Pencil size={14} />,
          onClick: (u) => setEditUser(u),

        },
        {
          hidden: !can("USER_ROLE_ASSIGN") || isDeleted,
          id: "assign-role",
          label: isVietnamese ? "Phân vai trò RBAC" : "Assign RBAC Role",
          icon: <Shield size={14} />,
          disabled: isSelf,
          onClick: (u) => setAssignRoleUser(u),

        },
      ];

      if (isDeleted) {
        actions.push({
          hidden: !canRestore,
          id: "restore",
          label: isVietnamese ? "Khôi phục tài khoản" : "Restore Account",
          icon: <RotateCcw size={14} />,
          variant: "primary",
          onClick: (u) =>
            setDeleteModalState({
              user: u,
              mode: "restore",
              open: true
            }),

        });
      } else {
        actions.push({
          id: "toggle-active",
          label: rowUser.isActive ? (isVietnamese ? "Vô hiệu hóa" : "Deactivate") : (isVietnamese ? "Kích hoạt" : "Activate"),
          icon: rowUser.isActive ? <Lock size={14} /> : <Unlock size={14} />,
          hidden: !canUpdate,
          disabled: isSelf && rowUser.isActive,
          onClick: u => setDeleteModalState({
            user: u,
            mode: u.isActive ? "deactivate" : "activate",
            open: true
          }),

        });
        actions.push({
          id: "delete",
          hidden: !canDelete,
          label: isVietnamese ? "Xóa tài khoản" : "Delete account",
          icon: <Trash2 size={14} />,
          variant: "danger",
          disabled: isSelf,
          onClick: (u) =>
            setDeleteModalState({
              user: u,
              mode: "delete",
              open: true
            }),

        });
      }

      return actions;
    },
    [currentAdmin, isVietnamese, canUpdate, canDelete, canRestore],
  );

  // Columns definition
  const columns = useMemo<ColumnDef<TableFeatureSet, UserResponseDto, any>[]>(() => {
    return [
      {
        id: "select",
        header: () => <TableSelectionHeader />,
        cell: ({ row }) => <TableSelectionRow row={row} />,
        enableSorting: false,
        enableColumnFilter: false,

      },
      {
        id: "user",
        accessorKey: "fullName",
        header: isVietnamese ? "Người dùng" : "User",
        cell: ({ row }) => {
          const u = row.original;
          const initials = getUserInitials(u);

          return (
            <div className="flex items-center gap-3">
              <Link
                href={`/users/${u.id}`}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background border border-border/40 font-mono text-xs font-bold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] hover:border-primary/60 hover:scale-105 transition-all cursor-pointer"
                title={isVietnamese ? "Nhấp để xem hồ sơ chi tiết" : "Click to view full profile"}
              >
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt=""
                    className="size-full rounded-xl object-cover"
                  />
                ) : (
                  initials
                )}
              </Link>
              <div className="flex flex-col min-w-0">
                <Link
                  href={`/users/${u.id}`}
                  className="font-bold text-foreground text-xs sm:text-sm truncate hover:text-primary hover:underline transition-colors cursor-pointer"
                  title={isVietnamese ? "Nhấp để xem hồ sơ chi tiết" : "Click to view full profile"}
                >
                  {u.fullName || (isVietnamese ? "Chưa đặt tên" : "Unnamed")}
                </Link>
                <span className="text-[11px] text-muted-foreground truncate font-mono">
                  {u.email}
                </span>
              </div>
            </div>
          );
        },

      },
      {
        id: "role",
        enableSorting: false,
        accessorKey: "roleId",
        header: isVietnamese ? "Vai trò" : "Role",
        cell: ({ row }) => {
          const rName = row.original.role?.name || "USER";
          const colorClass = getRoleBadgeStyle(rName).badgeClass;
          const siteCount = Array.isArray(row.original.siteIds) ? row.original.siteIds.length : 0;

          return (
            <div className="flex flex-col gap-1 items-start">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-mono text-[10px] font-bold tracking-wide uppercase ${colorClass}`}
              >
                <Shield size={11} className="shrink-0" />
                {rName}
              </span>
              {rName !== "ADMIN" && siteCount > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Building2 size={10} className="text-primary shrink-0" />
                  {siteCount} {isVietnamese ? "công trường" : "sites"}
                </span>
              )}
            </div>
          );
        },

      },
      {
        id: "status",
        enableSorting: false,
        accessorKey: "isActive",
        header: isVietnamese ? "Trạng thái" : "Status",
        cell: ({ row }) => {
          const accountStatus = getUserAccountStatus(row.original);

          if (accountStatus === "deleted") {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground line-through opacity-75">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                {isVietnamese ? "Đã xóa" : "Deleted"}
              </span>
            );
          }

          if (accountStatus === "locked") {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                {isVietnamese ? "Tạm khóa" : "Locked"}
              </span>
            );
          }

          if (accountStatus === "active") {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)] shrink-0" />
                {isVietnamese ? "Hoạt động" : "Active"}
              </span>
            );
          }

          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              {isVietnamese ? "Vô hiệu hóa" : "Inactive"}
            </span>
          );
        },

      },
      {
        id: "twoFactor",
        enableSorting: false,
        accessorKey: "twoFactorEnabled",
        header: isVietnamese ? "Bảo mật 2FA" : "2FA Security",
        cell: ({ row }) => {
          const enabled = Boolean(row.original.twoFactorEnabled);
          return enabled ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <ShieldCheck size={14} className="text-primary" />
              <span>{isVietnamese ? "Đã bật" : "Enabled"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground/70">
              <ShieldAlert size={14} className="text-muted-foreground/50" />
              <span>{isVietnamese ? "Chưa bật" : "Disabled"}</span>
            </span>
          );
        },

      },
      {
        id: "phoneNumber",
        enableSorting: false,
        accessorKey: "phoneNumber",
        header: isVietnamese ? "Số điện thoại" : "Phone Number",
        cell: ({ row }) => (
          <PhoneReveal
            key={row.original.id}
            phoneNumber={row.original.phoneNumber}
            isVietnamese={isVietnamese}
          />
        ),

      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: isVietnamese ? "Ngày tham gia" : "Joined Date",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleDateString(
                isVietnamese ? "vi-VN" : "en-US",
              )
              : "-"}
          </span>
        ),

      },
      {
        id: "actions",
        header: () => <span className="sr-only">{isVietnamese ? "Thao tác" : "Actions"}</span>,
        cell: ({ row }) => {
          const actions = getRowActions(row.original);
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/users/${row.original.id}`);
                }}
                className="inline-flex size-7 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground hover:text-primary hover:border-primary/40 shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)] transition-all cursor-pointer"
                title={isVietnamese ? "Xem hồ sơ chi tiết" : "View full profile"}
                aria-label={isVietnamese ? "Xem hồ sơ chi tiết" : "View full profile"}
              >
                <ExternalLink size={13} />
              </button>
              <TableRowActions
                row={row}
                actions={actions}
                label={isVietnamese ? "Thao tác" : "Actions"}
              />
            </div>
          );
        },
        enableSorting: false,
        enableColumnFilter: false,

      },
    ];
  }, [getRowActions, isVietnamese]);

  const runBulk = async (isActive: boolean) => {
    if (bulkPending || !canUpdate) return;
    const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    const validIds = selectedIds.filter(id => tableData.some(u => u.id === id && !u.deletedAt) && (isActive || id !== currentAdmin?.id));
    if (!validIds.length) {
      toast.error(isVietnamese ? "Không có tài khoản hợp lệ để cập nhật. Không thể tự vô hiệu hóa hoặc cập nhật tài khoản đã xóa." : "No eligible accounts. You cannot deactivate yourself or update deleted accounts.");
      setBulkMode(null);
      return;
    }
    setBulkPending(true);
    try {
      const { succeeded, failed } = await settleInBatches(validIds, id => userService.updateUser(id, { isActive }));
      setRowSelection(Object.fromEntries(failed.map(id => [id, true])));
      const message = isVietnamese ? `${succeeded.length} thành công, ${failed.length} thất bại.` : `${succeeded.length} succeeded, ${failed.length} failed.`;
      if (failed.length) toast.error(message); else toast.success(message);
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
    } finally {
      setBulkPending(false);
      setBulkMode(null);
    }
  };

  const selectedCount = Object.keys(rowSelection).filter(
    (k) => rowSelection[k],
  ).length;

  const bulkActionsList = useMemo<TableBulkAction[]>(() => {
    const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

    return [
      {
        id: "bulk-activate",
        label: isVietnamese ? "Kích hoạt" : "Activate",
        icon: <Unlock size={14} />,
        variant: "primary",
        disabled: bulkPending || !canUpdate,
        onClick: () => setBulkMode(true),

      },
      {
        id: "bulk-deactivate",
        label: isVietnamese ? "Vô hiệu hóa" : "Deactivate",
        icon: <Lock size={14} />,
        variant: "danger",
        disabled: bulkPending || !canUpdate,
        onClick: () => setBulkMode(false),

      },
    ];
  }, [rowSelection, isVietnamese, bulkPending, canUpdate]);

  const selectFilterClass = [
    "h-9 rounded-xl px-3 text-xs font-semibold",
    "border border-[var(--shadow-dark)]/30 dark:border-white/10 bg-background text-foreground",
    "shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]",
    "focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
  ].join(" ");

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Table Component */}
      <Table
        data={tableData}
        columns={columns}
        variant={variant}
        loading={isLoading}
        fetching={isFetching || bulkPending}
        error={error}
        onRetry={() => {
          void Promise.all([
            refetch(),
            queryClient.invalidateQueries({ queryKey: userKeys.summary() }),
          ]);
        }}
        globalFilter={search}
        onGlobalFilterChange={value => setSearch(String(value ?? ""))}
        filterKey={`${roleFilter}:${statusFilter}`}
        features={{ rowSelection: viewMode === "table" && canUpdate && statusFilter !== "deleted" }}
        emptyMessage={
          isVietnamese
            ? "Không tìm thấy người dùng nào phù hợp với điều kiện tìm kiếm."
            : "No users found matching current search or filter criteria."
        }
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
        pageCount={pageCount}
        rowCount={totalCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        onRowClick={(row) => router.push(`/users/${row.original.id}`)}
      >
        {/* Custom Toolbar */}
        <TableToolbar
          searchPlaceholder={
            isVietnamese
              ? "Tìm kiếm họ tên, email, số điện thoại..."
              : "Search by name, email, phone number..."
          }
          showSearch={true}
          showColumnVisibility={viewMode === "table"}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Switcher (Table / Cards) */}
              <SegmentedControl<UserViewMode>
                options={viewModeOptions}
                value={viewMode}
                onValueChange={handleViewModeChange}
                aria-label={t("users.view.switcherLabel")}
                size="sm"
              />
              {/* Refresh Button */}
              <RefreshIconButton
                onRefresh={() =>
                  Promise.all([
                    refetch(),
                    queryClient.invalidateQueries({ queryKey: userKeys.summary() }),
                  ])
                }
                isRefreshing={isFetching}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] hover:text-foreground hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"
                title={isVietnamese ? "Làm mới dữ liệu" : "Refresh data"}
                iconClassName="size-3.5"
              />
              {/* Add User Button */}
              {canCreate ? <Button
                variant="primary"
                size="sm"
                className="h-9 gap-1.5 whitespace-nowrap px-3 text-xs sm:text-sm shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]"
                onClick={() => setIsCreateOpen(true)}
              >
                <UserPlus size={15} className="shrink-0" />
                <span>{t("users.create")}</span>
              </Button> : null}
            </div>
          }
        />

        {/* Quick Role Filter Bar (hiển thị cả ở chế độ Bảng & Card) */}
        <UserRoleFilterBar
          roles={roles}
          value={roleFilter}
          onChange={handleRoleFilterChange}
          summaryTotal={summaryTotal}
          roleCounts={roleCounts}
          loading={isLoadingRoles}
        />

        {/* Expandable Filter Panel */}
        <TableFilterPanel active={hasActiveFilters} onReset={handleResetFilters}>
              {/* Filter: Role */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {isVietnamese ? "Vai trò (Role)" : "Role"}
                </label>
                <select
                  id="users-role-filter" aria-label={isVietnamese ? "Vai trò" : "Role"} value={roleFilter}
                  onChange={(e) => {
                    handleRoleFilterChange(e.target.value);
                  }}
                  className={`w-full ${selectFilterClass}`}
                >
                  <option value="all">
                    {t("users.filter.allRoles")}
                  </option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter: Status */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {isVietnamese ? "Trạng thái tài khoản" : "Account Status"}
                </label>
                <select
                  id="users-status-filter" aria-label={isVietnamese ? "Trạng thái tài khoản" : "Account status"} value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  className={`w-full ${selectFilterClass}`}
                >
                  <option value="all">{t("users.filter.allStatus")}</option>
                  <option value="active">{isVietnamese ? "Đã kích hoạt" : "Enabled accounts"}</option>
                  <option value="twoFactor">{isVietnamese ? "Đã bật 2FA" : "2FA Enabled"}</option>
                  <option value="inactive">{t("users.filter.inactive")}</option>
                  <option value="deleted">{t("users.filter.deleted")}</option>
                </select>
              </div>

            </TableFilterPanel>

        {/* Bulk Actions Floating Bar (chỉ hiển thị ở chế độ Bảng) */}
        {viewMode === "table" && selectedCount > 0 && (
          <div className="p-3 border-b border-border/30 bg-primary/5">
            <TableBulkActions
              actions={bulkActionsList}
              selectedCount={selectedCount}
              onClearSelection={() => setRowSelection({})}
              selectionLabel={
                isVietnamese ? "người dùng đã chọn" : "users selected"
              }
              clearSelectionLabel={isVietnamese ? "Bỏ chọn" : "Deselect"}
            />
          </div>
        )}

        {/* Table Rows hoặc Responsive Card Grid */}
        {viewMode === "card" ? (
          <UserCardGrid
            users={tableData}
            loading={isLoading}
            fetching={isFetching || bulkPending}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
            totalCount={totalCount}
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            sortValue={cardSortValue}
            onSortChange={handleCardSortChange}
            currentAdminId={currentAdmin?.id}
            canUpdate={canUpdate}
            canAssignRole={canAssignRole}
            canDelete={canDelete}
            canRestore={canRestore}
            onViewProfile={(u) => router.push(`/users/${u.id}`)}
            onEdit={(u) => setEditUser(u)}
            onAssignRole={(u) => setAssignRoleUser(u)}
            onToggleActive={(u) =>
              setDeleteModalState({
                user: u,
                mode: u.isActive ? "deactivate" : "activate",
                open: true,
              })
            }
            onRestore={(u) =>
              setDeleteModalState({
                user: u,
                mode: "restore",
                open: true,
              })
            }
            onDelete={(u) =>
              setDeleteModalState({
                user: u,
                mode: "delete",
                open: true,
              })
            }
            onRoleBadgeClick={handleRoleFilterChange}
          />
        ) : (
          <TableContent />
        )}

        {/* Server Pagination */}
        <TablePagination
          pageSizeOptions={[10, 12, 20, 50]}
          showPageSizeSelector={true}
          showRowCount={true}
        />
      </Table>

      <ConfirmDialog
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        open={bulkMode !== null}
        onClose={() => {
          if (!bulkPending) setBulkMode(null);
        }}
        onConfirm={async () => {
          if (bulkMode !== null) await runBulk(bulkMode);
        }}
        loading={bulkPending}
        variant={bulkMode ? "default" : "danger"}
        title={isVietnamese ? "Xác nhận cập nhật trạng thái tài khoản" : "Confirm account status update"}
        description={isVietnamese ? `Thao tác trên ${selectedCount} tài khoản đã chọn. Tài khoản hiện tại và tài khoản đã xóa sẽ được bỏ qua khi cần.` : `Update ${selectedCount} selected accounts. Your own and deleted accounts will be skipped where applicable.`}
      />
      {/* Modals & Dialogs */}
      <CreateUserModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <EditUserModal
        open={Boolean(editUser)}
        onOpenChange={(open) => !open && setEditUser(null)}
        user={editUser}
      />

      <AssignUserRoleModal
        open={Boolean(assignRoleUser)}
        onOpenChange={(open) => !open && setAssignRoleUser(null)}
        user={assignRoleUser}
      />

      <ConfirmUserDeleteModal
        open={deleteModalState.open}
        onClose={() => setDeleteModalState({
          user: null,
          mode: "delete",
          open: false
        })}
        user={deleteModalState.user}
        mode={deleteModalState.mode}
      />
    </div>
  );
}
