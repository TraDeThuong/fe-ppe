"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Ambulance,
  Check,
  Copy,
  Edit2,
  ExternalLink,
  Flame,
  Loader2,
  Mail,
  Phone,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  User,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssignUserSites, userKeys } from "@/hooks/users";
import { useCan } from "@/hooks/use-can";
import { collectCatalog } from "@/lib/table-utils";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { userService } from "@/services/user.service";
import { resolveDisplayOfficers } from "../../site-helpers";
import type { SiteContactOfficer, SiteItem, UserResponseDto } from "@/types";

export interface SitePersonnelTabProps {
  site: SiteItem;
  onEditSite?: () => void;
}

export function SitePersonnelTab({ site, onEditSite }: SitePersonnelTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canReadUsers = can("USER_READ");
  const canUpdateUsers = can("USER_UPDATE");

  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const displayOfficers: SiteContactOfficer[] = useMemo(
    () =>
      resolveDisplayOfficers(
        site,
        isVietnamese ? "Người phụ trách công trường" : "Site contact person",
      ),
    [site, isVietnamese],
  );

  // Fetch system users to list authorized personnel (User.siteIds includes site.id)
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<UserResponseDto[]>({
    queryKey: [...userKeys.lists(), "site-personnel-catalog"],
    queryFn: () =>
      collectCatalog(async (page, limit) => {
        const res = await userService.getUsers({ page, limit, isDeleted: false });
        return { items: res.data, meta: res.meta };
      }),
    enabled: canReadUsers,
    staleTime: 30 * 1000,
  });

  const assignSitesMutation = useAssignUserSites();

  const assignedUsers = useMemo(
    () => allUsers.filter((u) => Array.isArray(u.siteIds) && u.siteIds.includes(site.id)),
    [allUsers, site.id],
  );

  const unassignedUsers = useMemo(
    () => allUsers.filter((u) => !Array.isArray(u.siteIds) || !u.siteIds.includes(site.id)),
    [allUsers, site.id],
  );

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.success(
      isVietnamese
        ? `Đã sao chép số điện thoại ${phone}`
        : `Copied phone number ${phone}`,
    );
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleAssignUser = async () => {
    if (!selectedUserId) return;
    const target = allUsers.find((u) => u.id === selectedUserId);
    if (!target) return;
    const currentSites = target.siteIds || [];
    if (currentSites.includes(site.id)) return;
    await assignSitesMutation.mutateAsync({
      id: target.id,
      siteIds: [...currentSites, site.id],
    });
    setSelectedUserId("");
  };

  const handleRevokeUser = async (user: UserResponseDto) => {
    const nextSites = (user.siteIds || []).filter((id) => id !== site.id);
    await assignSitesMutation.mutateAsync({
      id: user.id,
      siteIds: nextSites,
    });
  };

  const emergencyContacts = [
    {
      name: isVietnamese ? "Trung tâm Cấp cứu 115" : "National Ambulance Center 115",
      type: isVietnamese
        ? "Y tế & Cấp cứu khẩn cấp quốc gia"
        : "National Medical Emergency Services",
      phone: "115",
      icon: Ambulance,
    },
    {
      name: isVietnamese
        ? "Đội Cảnh sát PCCC & CNCH"
        : "Fire Rescue & Prevention Squad 114",
      type: isVietnamese
        ? "Phòng cháy chữa cháy & Cứu hộ cứu nạn"
        : "Fire Fighting, Search & Rescue Operations",
      phone: "114",
      icon: Flame,
    },
    ...(site.contactPhone
      ? [
          {
            name: isVietnamese
              ? `Hotline Công trường (${site.name})`
              : `Site Dispatch Hotline (${site.name})`,
            type: isVietnamese
              ? "Số điện thoại liên hệ chính"
              : "Primary Site Contact Number",
            phone: site.contactPhone,
            icon: ShieldAlert,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {/* =====================================================
            1. BAN CHỈ HUY AN TOÀN TẠI CHỖ (contactOfficers)
        ===================================================== */}
        <section className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl p-4 sm:p-5 border border-white/80 dark:border-white/5 bg-background dark:bg-card shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.9)] dark:shadow-[8px_8px_18px_rgba(0,0,0,0.45),-3px_-3px_9px_rgba(255,255,255,0.025)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/70 dark:border-white/5 bg-background text-primary dark:bg-card shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)]">
                <Users size={19} strokeWidth={2.1} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
                  {isVietnamese ? "Ban Chỉ Huy An Toàn" : "On-site Safety Team"}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isVietnamese
                    ? "Đầu mối phụ trách tại công trường"
                    : "On-site safety contacts"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onEditSite && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEditSite}
                  className="h-7 gap-1 rounded-lg px-2.5 text-[11px]"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>{isVietnamese ? "Sửa" : "Edit"}</span>
                </Button>
              )}

              <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.08] px-2.5 text-xs font-semibold text-primary shadow-nm-inset">
                <ShieldCheck size={13} />
                {displayOfficers.length}
              </span>
            </div>
          </div>

          <div className="mb-4 h-px bg-gradient-to-r from-primary/30 via-border/50 to-transparent" />

          <div className="flex flex-1 flex-col gap-3">
            {displayOfficers.length > 0 ? (
              displayOfficers.map((officer, index) => (
                <article
                  key={`${officer.name}-${index}`}
                  className="rounded-xl p-3 border border-white/80 dark:border-white/5 bg-background dark:bg-card shadow-[4px_4px_9px_var(--shadow-dark),-3px_-3px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_9px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.025)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <User size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {officer.name}
                        </p>
                        {officer.roleTitle && (
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {officer.roleTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {officer.userId && (
                      <Link
                        href={`/users/${officer.userId}`}
                        title={isVietnamese ? "Xem hồ sơ tài khoản" : "View user profile"}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  {officer.phones?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {officer.phones.map((phone, phoneIndex) => {
                        const isCopied = copiedPhone === phone;
                        return (
                          <div
                            key={`${phone}-${phoneIndex}`}
                            className="flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 bg-background/80 dark:bg-background/50 shadow-nm-inset"
                          >
                            <Phone size={14} className="shrink-0 text-primary" />
                            <a
                              href={`tel:${phone}`}
                              className="min-w-0 flex-1 truncate text-sm font-semibold tabular-nums text-foreground transition-colors hover:text-primary"
                            >
                              {phone}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(phone)}
                              aria-label={
                                isVietnamese ? "Sao chép số điện thoại" : "Copy phone number"
                              }
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                            >
                              {isCopied ? (
                                <Check size={14} className="text-primary" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="flex min-h-28 flex-1 flex-col items-center justify-center rounded-xl bg-background/40 px-4 py-6 text-center">
                <Users size={22} className="mb-2 text-muted-foreground/60" />
                <p className="text-sm font-medium text-muted-foreground">
                  {isVietnamese
                    ? "Chưa có thông tin chỉ huy an toàn"
                    : "No safety team information"}
                </p>
                {onEditSite && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onEditSite}
                    className="mt-3 gap-1.5 rounded-xl text-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>{isVietnamese ? "Phân công cán bộ" : "Assign Officers"}</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
            <ShieldCheck size={14} className="shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {isVietnamese
                ? "Liên hệ trực tiếp để xử lý vấn đề an toàn tại chỗ."
                : "Contact the team for on-site safety issues."}
            </p>
          </div>
        </section>

        {/* =====================================================
            2. DANH BẠ KHẨN CẤP NGOẠI VI
        ===================================================== */}
        <section className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl p-4 sm:p-5 border border-white/80 dark:border-white/5 bg-background dark:bg-card shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.9)] dark:shadow-[8px_8px_18px_rgba(0,0,0,0.45),-3px_-3px_9px_rgba(255,255,255,0.025)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 text-danger shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)]">
                <ShieldAlert size={19} strokeWidth={2.1} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
                  {isVietnamese
                    ? "Danh Bạ Khẩn Cấp Ngoại Vi"
                    : "External Emergency Contacts"}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isVietnamese
                    ? "Các đầu mối hỗ trợ khẩn cấp"
                    : "Emergency response hotlines"}
                </p>
              </div>
            </div>

            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-danger/10 px-2.5 text-xs font-semibold text-danger">
              <span className="size-1.5 animate-pulse rounded-full bg-danger" />
              {isVietnamese ? "Khẩn cấp" : "Emergency"}
            </span>
          </div>

          <div className="mb-4 h-px bg-gradient-to-r from-danger/35 via-border/50 to-transparent" />

          <div className="flex flex-1 flex-col gap-2.5">
            {emergencyContacts.map((contact, index) => {
              const isCopied = copiedPhone === contact.phone;
              const ContactIcon = contact.icon;
              return (
                <article
                  key={`${contact.name}-${index}`}
                  className="group flex min-w-0 items-center gap-3 rounded-xl p-3 border border-white/80 dark:border-white/5 bg-background dark:bg-card shadow-[4px_4px_9px_var(--shadow-dark),-3px_-3px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_9px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.025)]"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                    <ContactIcon size={18} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {contact.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {contact.type}
                    </p>
                    <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                      <Phone size={12} className="shrink-0 text-danger" />
                      <a
                        href={`tel:${contact.phone}`}
                        className="truncate text-sm font-bold tabular-nums text-danger hover:opacity-75"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(contact.phone)}
                      aria-label={
                        isVietnamese ? "Sao chép số điện thoại" : "Copy phone number"
                      }
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger transition"
                    >
                      {isCopied ? (
                        <Check size={15} className="text-danger" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-danger px-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-105"
                    >
                      <PhoneCall size={13} />
                      <span>{isVietnamese ? "Gọi" : "Call"}</span>
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-danger/5 px-3 py-2">
            <ShieldAlert size={14} className="shrink-0 text-danger" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {isVietnamese
                ? "Ưu tiên gọi số khẩn cấp phù hợp với tình huống."
                : "Call the appropriate emergency service for the situation."}
            </p>
          </div>
        </section>
      </div>

      {/* =====================================================
          3. NHÂN SỰ HỆ THỐNG ĐƯỢC CẤP QUYỀN TRUY CẬP SITE (User.siteIds)
      ===================================================== */}
      {canReadUsers && (
        <section className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-4 sm:p-5 shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.9)] dark:shadow-[8px_8px_18px_rgba(0,0,0,0.45),-3px_-3px_9px_rgba(255,255,255,0.025)] space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck size={19} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground sm:text-base">
                  {isVietnamese
                    ? "Tài khoản Hệ thống Được phân quyền Công trường"
                    : "Authorized System Personnel (Site Access)"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isVietnamese
                    ? `Các tài khoản có quyền truy cập và vận hành dữ liệu thuộc công trường ${site.code}.`
                    : `System user accounts granted operational access to ${site.code}.`}
                </p>
              </div>
            </div>

            {canUpdateUsers && unassignedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  aria-label={isVietnamese ? "Chọn người dùng" : "Select user"}
                  className="h-9 max-w-[240px] rounded-xl border border-border/40 bg-surface px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">
                    {isVietnamese ? "Chọn nhân sự cấp quyền..." : "Select user to assign..."}
                  </option>
                  {unassignedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} ({u.role?.name || "User"})
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!selectedUserId || assignSitesMutation.isPending}
                  onClick={() => void handleAssignUser()}
                  className="h-9 gap-1.5 rounded-xl text-xs"
                >
                  {assignSitesMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  <span>{isVietnamese ? "Cấp quyền" : "Assign"}</span>
                </Button>
              </div>
            )}
          </div>

          {usersLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-elevated/40" />
              ))}
            </div>
          ) : assignedUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-6 text-center text-xs text-muted-foreground">
              {isVietnamese
                ? "Chưa có tài khoản nhân sự nào được gắn trực tiếp công trường này (Quản trị viên Admin mặc định có toàn quyền truy cập)."
                : "No users explicitly assigned to this site yet (Admins have global access by default)."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assignedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-start justify-between gap-2.5 rounded-xl border border-border/30 bg-surface p-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/users/${u.id}`}
                        className="truncate text-xs font-bold text-foreground hover:text-primary hover:underline"
                      >
                        {u.fullName || u.email}
                      </Link>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                          u.isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-danger/10 text-danger"
                        }`}
                      >
                        {u.isActive ? "ACTIVE" : "LOCKED"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                        {u.role?.name || "USER"}
                      </span>
                      {u.phoneNumber && <span className="font-mono">{u.phoneNumber}</span>}
                    </div>

                    {u.email && (
                      <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </p>
                    )}
                  </div>

                  {canUpdateUsers && (
                    <button
                      type="button"
                      onClick={() => void handleRevokeUser(u)}
                      disabled={assignSitesMutation.isPending}
                      title={
                        isVietnamese
                          ? "Thu hồi quyền truy cập công trường này"
                          : "Revoke site access"
                      }
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger transition"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
