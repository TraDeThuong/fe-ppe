"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Eye,
  Mail,
  Phone,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SculptedModal } from "@/components/ui/modal";
import {
  AssignUserRoleModal,
  UserDetailModal,
} from "@/components/features/users/modals";
import { useAssignUserRole } from "@/hooks/rbac";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import type { RoleDto, UserResponseDto } from "@/types";

export interface RoleUsersTabProps {
  role: RoleDto;
  roleUsers: UserResponseDto[];
  allUsers: UserResponseDto[];
  loading?: boolean;
}

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function RoleUsersTab({
  role,
  roleUsers,
  allUsers,
  loading = false,
}: RoleUsersTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canAssignUserRole = can("USER_ROLE_ASSIGN");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "LOCKED" | "2FA"
  >("ALL");

  // Modals for viewing user detail or changing role
  const [selectedUserForDetail, setSelectedUserForDetail] =
    useState<UserResponseDto | null>(null);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] =
    useState<UserResponseDto | null>(null);

  // Modal for assigning existing users from other roles into this role
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");

  const assignUserRoleMutation = useAssignUserRole();

  // Filter users currently holding this role
  const filteredRoleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roleUsers.filter((u) => {
      const isLocked =
        !u.isActive ||
        Boolean(u.deletedAt) ||
        Boolean(u.lockedUntil && new Date(u.lockedUntil) > new Date());

      if (statusFilter === "ACTIVE" && isLocked) return false;
      if (statusFilter === "LOCKED" && !isLocked) return false;
      if (statusFilter === "2FA" && !u.twoFactorEnabled) return false;

      if (q) {
        const matchName = (u.fullName || "").toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        const matchPhone = (u.phoneNumber || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      return true;
    });
  }, [roleUsers, search, statusFilter]);

  // Users NOT in this role (candidates to assign into this role)
  const candidateUsers = useMemo(() => {
    const currentRoleUserIds = new Set(roleUsers.map((u) => u.id));
    const q = candidateSearch.trim().toLowerCase();
    return allUsers
      .filter((u) => !currentRoleUserIds.has(u.id) && !u.deletedAt)
      .filter((u) => {
        if (!q) return true;
        return (
          (u.fullName || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.role?.name || "").toLowerCase().includes(q)
        );
      });
  }, [allUsers, roleUsers, candidateSearch]);

  const handleAssignCandidateToThisRole = async () => {
    if (!selectedCandidateId) return;
    try {
      await assignUserRoleMutation.mutateAsync({
        userId: selectedCandidateId,
        payload: { roleId: role.id },
      });
      setAddMemberModalOpen(false);
      setSelectedCandidateId("");
    } catch {
      // Handled by hook toast
    }
  };

  const formatDate = (dateInput?: string | Date | null) => {
    if (!dateInput) return "—";
    try {
      return new Date(dateInput).toLocaleDateString(
        isVietnamese ? "vi-VN" : "en-US",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        },
      );
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4">
      {/* ── TOOLBAR ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-surface p-3.5 sm:p-4 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="h-9 w-full rounded-xl border border-border/40 bg-background/70 pl-9 pr-3 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] focus:border-primary focus:outline-none dark:border-white/10 dark:bg-background/50"
          />
        </div>

        {/* Status Filters & Add Member Action */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-xl border border-border/40 bg-background/60 p-1 shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
            {(
              [
                {
                  key: "ALL",
                  label: isVietnamese
                    ? `Tất cả (${roleUsers.length})`
                    : `All (${roleUsers.length})`,
                },
                {
                  key: "ACTIVE",
                  label: isVietnamese ? "Đang hoạt động" : "Active",
                },
                {
                  key: "2FA",
                  label: isVietnamese ? "Đã bật 2FA" : "2FA Enabled",
                },
                {
                  key: "LOCKED",
                  label: isVietnamese ? "Đã khóa" : "Locked",
                },
              ] as const
            ).map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  statusFilter === st.key
                    ? "bg-card text-primary shadow-sm border border-primary/25 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {canAssignUserRole && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setAddMemberModalOpen(true)}
                className="h-8 gap-1.5 rounded-xl text-xs font-bold"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>
                  {isVietnamese
                    ? "Gán nhân sự vào vai trò"
                    : "Assign User to Role"}
                </span>
              </Button>
            )}

            <Link href="/users">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl text-xs"
              >
                <span>{t("roles.detail.usersManagerBtn")}</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── PERSONNEL CARDS GRID ──────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl bg-surface-elevated/40"
            />
          ))}
        </div>
      ) : filteredRoleUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-surface p-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              {t("roles.detail.noUsersInRole")}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md">
              {t("roles.detail.noUsersHint")}
            </p>
          </div>
          {canAssignUserRole && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setAddMemberModalOpen(true)}
              className="gap-1.5 rounded-xl text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{t("roles.detail.assignNow")}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoleUsers.map((user) => {
            const isLocked =
              !user.isActive ||
              Boolean(user.deletedAt) ||
              Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date());
            const is2FA = Boolean(user.twoFactorEnabled);

            return (
              <article
                key={user.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/80 bg-surface p-4 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)]"
              >
                <div className="space-y-3">
                  {/* Top Identity */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-primary/10 font-mono text-sm font-black text-primary shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:border-white/10">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName || user.email || ""}
                            className="h-full w-full rounded-xl object-cover"
                          />
                        ) : (
                          getInitials(user.fullName || user.email)
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-foreground">
                          {user.fullName || t("roles.detail.unnamed")}
                        </h4>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-primary">
                          <Shield className="h-3 w-3" />
                          {role.name}
                        </span>
                      </div>
                    </div>

                    {/* Active / Locked Badge */}
                    {isLocked ? (
                      <Badge
                        variant="secondary"
                        size="sm"
                        className="text-[10px] text-muted-foreground shrink-0"
                      >
                        {t("roles.detail.locked")}
                      </Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {t("roles.detail.active")}
                      </span>
                    )}
                  </div>

                  {/* Contact & Security Details */}
                  <div className="rounded-xl border border-border/30 bg-background/55 p-2.5 text-xs space-y-1.5 shadow-[inset_2px_2px_4px_var(--shadow-dark)]">
                    <div className="flex items-center gap-2 text-muted-foreground truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                      <span className="font-mono text-[11px] truncate text-foreground/90">
                        {user.email || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                        <span className="font-mono">
                          {user.phoneNumber ||
                            (isVietnamese ? "Chưa có SĐT" : "No phone")}
                        </span>
                      </span>

                      {is2FA ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-primary">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          2FA Bật
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground/80">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {isVietnamese ? "Chưa 2FA" : "No 2FA"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2.5 text-[11px]">
                  <span className="text-muted-foreground">
                    {t("roles.detail.created", {
                      date: formatDate(user.createdAt),
                    })}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUserForDetail(user)}
                      className="h-7 px-2 text-xs text-primary hover:text-primary gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{t("roles.detail.detailBtn")}</span>
                    </Button>

                    {canAssignUserRole && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserForRoleChange(user)}
                        className="h-7 px-2.5 text-xs rounded-lg gap-1"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-primary" />
                        <span>{isVietnamese ? "Đổi vai trò" : "Change Role"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── MODAL 1: VIEW USER PROFILE & SESSIONS ─────────────────────── */}
      <UserDetailModal
        open={Boolean(selectedUserForDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserForDetail(null);
        }}
        user={selectedUserForDetail}
      />

      {/* ── MODAL 2: CHANGE USER'S ROLE ───────────────────────────────── */}
      <AssignUserRoleModal
        open={Boolean(selectedUserForRoleChange)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserForRoleChange(null);
        }}
        user={selectedUserForRoleChange}
      />

      {/* ── MODAL 3: ASSIGN AN EXISTING USER TO THIS ROLE ─────────────── */}
      <SculptedModal
        open={addMemberModalOpen}
        onOpenChange={setAddMemberModalOpen}
        title={
          isVietnamese
            ? `Gán nhân sự vào vai trò ${role.name}`
            : `Assign User to ${role.name}`
        }
        description={
          isVietnamese
            ? "Chọn một tài khoản người dùng trong hệ thống để chuyển sang vai trò này."
            : "Select an existing user account to assign to this role."
        }
        icon={<UserPlus className="h-5 w-5 text-primary" />}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddMemberModalOpen(false)}
              disabled={assignUserRoleMutation.isPending}
            >
              {isVietnamese ? "Hủy" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!selectedCandidateId || assignUserRoleMutation.isPending}
              onClick={handleAssignCandidateToThisRole}
            >
              {assignUserRoleMutation.isPending
                ? isVietnamese
                  ? "Đang gán..."
                  : "Assigning..."
                : isVietnamese
                ? `Gán vào ${role.name}`
                : `Assign to ${role.name}`}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Tìm người dùng theo tên, email hoặc vai trò hiện tại..."
                  : "Search user by name, email or current role..."
              }
              className="h-9 w-full rounded-xl border border-border/50 bg-background pl-8 pr-3 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {candidateUsers.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-background/50 p-6 text-center text-muted-foreground">
                {isVietnamese
                  ? "Không tìm thấy người dùng nào khác để gán."
                  : "No other users available to assign."}
              </div>
            ) : (
              candidateUsers.map((candidate) => {
                const isSelected = selectedCandidateId === candidate.id;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    className={`w-full text-left flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border/50 bg-background hover:bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                        {getInitials(candidate.fullName || candidate.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">
                          {candidate.fullName || candidate.email}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          {candidate.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                        {candidate.role?.name || "USER"}
                      </Badge>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </SculptedModal>
    </div>
  );
}
