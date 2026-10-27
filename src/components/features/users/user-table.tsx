"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  ColumnDef,
  PaginationState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import {
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Pencil,
  Trash2,
  KeyRound,
  Eye,
  RotateCcw,
  Filter,
  RefreshCw,
  UserPlus,
  SlidersHorizontal,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

import {
  Table,
  TableToolbar,
  TableContent,
  TablePagination,
  TableSelectionHeader,
  TableSelectionRow,
  TableRowActions,
  type TableFeatureSet,
  type TableRowAction,
  type TableBulkAction,
  TableBulkActions,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useUsers, useDeleteUser, useUpdateUser } from "@/hooks/users";
import { useRoles } from "@/hooks/rbac";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { UserResponseDto } from "@/types";

import {
  CreateUserModal,
  EditUserModal,
  AssignUserRoleModal,
  AdminResetPasswordModal,
  ConfirmUserDeleteModal,
  UserDetailModal,
} from "./modals";

export interface UserTableProps {
  className?: string;
  variant?: "soft" | "sculpted";
}

export function UserTable({ className = "", variant = "soft" }: UserTableProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user: currentAdmin } = useAuth();
  const { data: roles = [] } = useRoles();

  // Query States
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [twoFactorFilter, setTwoFactorFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Table internal states
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Fetch Users
  const queryParams = useMemo(() => {
    return {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: debouncedSearch.trim() || undefined,
      roleName: roleFilter !== "all" ? roleFilter : undefined,
      isActive:
        statusFilter === "active"
          ? true
          : statusFilter === "inactive"
          ? false
          : undefined,
      isDeleted: statusFilter === "deleted" ? true : undefined,
      sortBy: (sorting[0]?.id as any) || "createdAt",
      order: (sorting[0]?.desc ? "desc" : "asc") as "asc" | "desc",
    };
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, roleFilter, statusFilter, sorting]);

  const {
    data: usersData,
    isLoading,
    isFetching,
    refetch,
  } = useUsers(queryParams);

  // Mutations for bulk actions
  const deleteMutation = useDeleteUser({ suppressToast: true });
  const updateMutation = useUpdateUser({ suppressToast: true });

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserResponseDto | null>(null);
  const [assignRoleUser, setAssignRoleUser] = useState<UserResponseDto | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserResponseDto | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{
    user: UserResponseDto | null;
    mode: "delete" | "restore";
    open: boolean;
  }>({
    user: null,
    mode: "delete",
    open: false,
  });
  const [detailUser, setDetailUser] = useState<UserResponseDto | null>(null);

  // Data processing: optional 2FA client-side filter
  const tableData = useMemo(() => {
    const rawData = usersData?.data ?? [];
    if (twoFactorFilter === "all") return rawData;
    if (twoFactorFilter === "enabled") return rawData.filter((u) => u.twoFactorEnabled);
    if (twoFactorFilter === "disabled") return rawData.filter((u) => !u.twoFactorEnabled);
    return rawData;
  }, [usersData?.data, twoFactorFilter]);

  const totalCount = usersData?.meta?.total ?? tableData.length;
  const pageCount = usersData?.meta?.totalPages ?? Math.ceil(totalCount / pagination.pageSize);

  const hasActiveFilters =
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    twoFactorFilter !== "all" ||
    Boolean(debouncedSearch);

  const handleResetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setTwoFactorFilter("all");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Row Actions definition
  const getRowActions = useCallback(
    (rowUser: UserResponseDto): TableRowAction<UserResponseDto>[] => {
      const isSelf = Boolean(currentAdmin?.id && rowUser.id === currentAdmin.id);
      const isDeleted = Boolean(rowUser.deletedAt);

      const actions: TableRowAction<UserResponseDto>[] = [
        {
          id: "view",
          label: isVietnamese ? "Xem chi tiết & Phiên" : "View Details & Sessions",
          icon: <Eye size={14} />,
          onClick: (u) => setDetailUser(u),
        },
        {
          id: "edit",
          label: isVietnamese ? "Chỉnh sửa thông tin" : "Edit Profile",
          icon: <Pencil size={14} />,
          onClick: (u) => setEditUser(u),
        },
        {
          id: "assign-role",
          label: isVietnamese ? "Phân vai trò RBAC" : "Assign RBAC Role",
          icon: <Shield size={14} />,
          disabled: isSelf,
          onClick: (u) => setAssignRoleUser(u),
        },
        {
          id: "reset-password",
          label: isVietnamese ? "Đặt lại mật khẩu" : "Reset Password",
          icon: <KeyRound size={14} />,
          onClick: (u) => setResetPasswordUser(u),
        },
      ];

      if (isDeleted) {
        actions.push({
          id: "restore",
          label: isVietnamese ? "Khôi phục tài khoản" : "Restore Account",
          icon: <RotateCcw size={14} />,
          variant: "primary",
          onClick: (u) =>
            setDeleteModalState({ user: u, mode: "restore", open: true }),
        });
      } else {
        actions.push({
          id: "delete",
          label: isSelf
            ? isVietnamese
              ? "Không thể tự khóa"
              : "Cannot lock own account"
            : isVietnamese
            ? "Khóa tài khoản"
            : "Deactivate Account",
          icon: <Trash2 size={14} />,
          variant: "danger",
          disabled: isSelf,
          onClick: (u) =>
            setDeleteModalState({ user: u, mode: "delete", open: true }),
        });
      }

      return actions;
    },
    [currentAdmin, isVietnamese],
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
          const initials = (u.fullName || u.email || "U").charAt(0).toUpperCase();

          return (
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background border border-border/40 font-mono text-xs font-bold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt=""
                    className="size-full rounded-xl object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-foreground text-xs sm:text-sm truncate">
                  {u.fullName || (isVietnamese ? "Chưa đặt tên" : "Unnamed")}
                </span>
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
        accessorKey: "roleId",
        header: isVietnamese ? "Vai trò" : "Role",
        cell: ({ row }) => {
          const rName = row.original.role?.name || "USER";

          const roleColors: Record<string, string> = {
            ADMIN: "border-primary/40 bg-primary/10 text-primary",
            SUPER_ADMIN: "border-primary/40 bg-primary/10 text-primary",
            SAFETY_MANAGER: "border-accent/40 bg-accent/10 text-accent",
            SAFETY_OFFICER: "border-accent/30 bg-accent/10 text-accent",
            MANAGER: "border-accent/30 bg-accent/10 text-accent",
          };

          const colorClass =
            roleColors[rName] || "border-border/60 bg-muted/40 text-muted-foreground";

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-mono text-[10px] font-bold tracking-wide uppercase ${colorClass}`}
            >
              <Shield size={11} className="shrink-0" />
              {rName}
            </span>
          );
        },
      },
      {
        id: "status",
        accessorKey: "isActive",
        header: isVietnamese ? "Trạng thái" : "Status",
        cell: ({ row }) => {
          const u = row.original;
          const isLocked = Boolean(u.lockedUntil && new Date(u.lockedUntil) > new Date());
          const isDeleted = Boolean(u.deletedAt);
          const isActive = u.isActive && !isDeleted && !isLocked;

          if (isDeleted) {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground line-through opacity-75">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                {isVietnamese ? "Đã xóa" : "Deleted"}
              </span>
            );
          }

          if (isLocked) {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                {isVietnamese ? "Tạm khóa" : "Locked"}
              </span>
            );
          }

          if (isActive) {
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
        accessorKey: "phoneNumber",
        header: isVietnamese ? "Số điện thoại" : "Phone Number",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">
            {row.original.phoneNumber || "-"}
          </span>
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
            <TableRowActions
              row={row}
              actions={actions}
              label={isVietnamese ? "Thao tác" : "Actions"}
            />
          );
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
    ];
  }, [getRowActions, isVietnamese]);

  // Bulk actions handlers
  const handleBulkDeactivate = async (selectedIds: string[]) => {
    // Filter out current admin for anti-lockout
    const validIds = selectedIds.filter((id) => id !== currentAdmin?.id);
    if (validIds.length === 0) {
      toast.error(
        isVietnamese
          ? "Không thể khóa chính tài khoản của bạn."
          : "Cannot deactivate your own account.",
      );
      return;
    }

    try {
      await Promise.all(validIds.map((id) => deleteMutation.mutateAsync(id)));
      toast.success(
        isVietnamese
          ? `Đã khóa thành công ${validIds.length} tài khoản.`
          : `Successfully deactivated ${validIds.length} accounts.`,
      );
      setRowSelection({});
    } catch {
      toast.error(
        isVietnamese
          ? "Đã xảy ra lỗi khi khóa tài khoản hàng loạt."
          : "An error occurred while bulk deactivating accounts.",
      );
    }
  };

  const handleBulkActivate = async (selectedIds: string[]) => {
    try {
      await Promise.all(
        selectedIds.map((id) =>
          updateMutation.mutateAsync({ id, payload: { isActive: true } }),
        ),
      );
      toast.success(
        isVietnamese
          ? `Đã kích hoạt lại ${selectedIds.length} tài khoản.`
          : `Successfully reactivated ${selectedIds.length} accounts.`,
      );
      setRowSelection({});
    } catch {
      toast.error(
        isVietnamese
          ? "Đã xảy ra lỗi khi kích hoạt tài khoản hàng loạt."
          : "An error occurred while bulk reactivating accounts.",
      );
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
        onClick: () => handleBulkActivate(selectedIds),
      },
      {
        id: "bulk-deactivate",
        label: isVietnamese ? "Khóa tài khoản" : "Deactivate",
        icon: <Lock size={14} />,
        variant: "danger",
        onClick: () => handleBulkDeactivate(selectedIds),
      },
    ];
  }, [rowSelection, isVietnamese]);

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
        onRowClick={(row) => setDetailUser(row.original)}
      >
        {/* Custom Toolbar */}
        <TableToolbar
          searchPlaceholder={
            isVietnamese
              ? "Tìm kiếm họ tên, email, số điện thoại..."
              : "Search by name, email, phone number..."
          }
          columnsLabel={isVietnamese ? "Cột" : "Columns"}
          toggleColumnsLabel={isVietnamese ? "Hiển thị cột" : "Toggle columns"}
          resetLabel={isVietnamese ? "Mặc định" : "Default"}
          recordsText={(all, filtered, isFilt) =>
            isVietnamese
              ? isFilt
                ? `${filtered} / ${all} bản ghi`
                : `${all} bản ghi`
              : isFilt
              ? `${filtered} / ${all} records`
              : `${all} records`
          }
          loadingText={isVietnamese ? "Đang tải dữ liệu..." : "Loading records..."}
          clearSearchLabel={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
          showSearch={true}
          showColumnVisibility={true}
          actions={
            <div className="flex items-center gap-2">
              {/* Filter Panel Toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  showFilters || hasActiveFilters
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/60 bg-background text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] hover:text-foreground"
                }`}
                title={isVietnamese ? "Lọc dữ liệu nâng cao" : "Advanced filters"}
              >
                <Filter size={13} />
                <span>{isVietnamese ? "Bộ lọc" : "Filters"}</span>
                {hasActiveFilters && (
                  <span className="flex size-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:text-foreground hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"
                title={isVietnamese ? "Làm mới dữ liệu" : "Refresh data"}
              >
                <RefreshCw size={14} className={isFetching ? "animate-spin text-primary" : ""} />
              </button>

              {/* Add User Button */}
              <Button
                variant="primary"
                size="md"
                className="gap-2 shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]"
                onClick={() => setIsCreateOpen(true)}
              >
                <UserPlus size={15} />
                <span>{t("users.create")}</span>
              </Button>
            </div>
          }
        />

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="p-4 sm:p-5 border-b border-border/30 bg-black/[0.015] dark:bg-white/[0.015] space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-primary" />
                {isVietnamese ? "Bộ lọc nâng cao" : "Advanced Filters"}
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <RotateCcw size={12} />
                  {isVietnamese ? "Xóa toàn bộ lọc" : "Clear all filters"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Filter: Role */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {isVietnamese ? "Vai trò (Role)" : "Role"}
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
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
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  className={`w-full ${selectFilterClass}`}
                >
                  <option value="all">{t("users.filter.allStatus")}</option>
                  <option value="active">{t("users.filter.active")}</option>
                  <option value="inactive">{t("users.filter.inactive")}</option>
                  <option value="deleted">{t("users.filter.deleted")}</option>
                </select>
              </div>

              {/* Filter: 2FA */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {isVietnamese ? "Bảo mật hai lớp (2FA)" : "Two-factor authentication (2FA)"}
                </label>
                <select
                  value={twoFactorFilter}
                  onChange={(e) => {
                    setTwoFactorFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  className={`w-full ${selectFilterClass}`}
                >
                  <option value="all">
                    {isVietnamese ? "Tất cả thiết lập" : "All 2FA settings"}
                  </option>
                  <option value="enabled">
                    {isVietnamese ? "Đã bật 2FA TOTP" : "2FA TOTP enabled"}
                  </option>
                  <option value="disabled">
                    {isVietnamese ? "Chưa bật 2FA" : "2FA disabled"}
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Floating Bar */}
        {selectedCount > 0 && (
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

        {/* Table Rows & Cells */}
        <TableContent />

        {/* Server Pagination */}
        <TablePagination
          pageSizeOptions={[10, 20, 50]}
          showPageSizeSelector={true}
          showRowCount={true}
          pageSizeLabel={isVietnamese ? "Số dòng" : "Rows"}
          perPageSuffix={isVietnamese ? "/ trang" : "/ page"}
          emptyText={isVietnamese ? "Không có bản ghi" : "No records found"}
          showingText={(startRow, endRow, totalRows) =>
            isVietnamese ? (
              <span>
                Hiển thị <strong className="text-foreground font-mono font-bold">{startRow}–{endRow}</strong> trong <strong className="text-foreground font-mono font-bold">{totalRows}</strong> dòng
              </span>
            ) : (
              <span>
                Showing <strong className="text-foreground font-mono font-bold">{startRow}–{endRow}</strong> of <strong className="text-foreground font-mono font-bold">{totalRows}</strong> users
              </span>
            )
          }
          pageOfText={(currentPage, pageCount) =>
            isVietnamese
              ? `Trang ${currentPage} / ${pageCount}`
              : `Page ${currentPage} of ${pageCount}`
          }
          firstPageTitle={isVietnamese ? "Trang đầu" : "First page"}
          prevPageTitle={isVietnamese ? "Trang trước" : "Previous page"}
          nextPageTitle={isVietnamese ? "Trang tiếp theo" : "Next page"}
          lastPageTitle={isVietnamese ? "Trang cuối" : "Last page"}
        />
      </Table>

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

      <AdminResetPasswordModal
        open={Boolean(resetPasswordUser)}
        onOpenChange={(open) => !open && setResetPasswordUser(null)}
        user={resetPasswordUser}
      />

      <ConfirmUserDeleteModal
        open={deleteModalState.open}
        onClose={() => setDeleteModalState({ user: null, mode: "delete", open: false })}
        user={deleteModalState.user}
        mode={deleteModalState.mode}
      />

      <UserDetailModal
        open={Boolean(detailUser)}
        onOpenChange={(open) => !open && setDetailUser(null)}
        user={detailUser}
        onEditClick={(u) => setEditUser(u)}
        onResetPasswordClick={(u) => setResetPasswordUser(u)}
      />
    </div>
  );
}
