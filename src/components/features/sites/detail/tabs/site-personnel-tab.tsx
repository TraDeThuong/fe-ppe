"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Ambulance,
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
  ChevronDown,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneReveal } from "@/components/ui/phone-reveal";
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        {/* =====================================================
        1. BAN CHỈ HUY AN TOÀN TẠI CHỖ (contactOfficers)
    ===================================================== */}
        <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
          <div>
            {/* Header */}
            <div className="relative mb-4 flex items-center justify-between gap-3 pb-4 before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-primary/35 before:via-border/45 before:to-transparent">
              <div className="flex min-w-0 items-center gap-3.5">
                {/* Extruded Icon Pod */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/70 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.03)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                    <Users size={17} strokeWidth={2.1} />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
                    {isVietnamese ? "Ban Chỉ Huy An Toàn" : "On-site Safety Team"}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isVietnamese
                      ? "Đầu mối phụ trách tại công trường"
                      : "On-site safety contacts"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {onEditSite && (
                  <button
                    type="button"
                    onClick={onEditSite}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[11px] border border-white/70 bg-surface px-2.5 text-[11px] font-bold text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] transition-all hover:text-primary active:shadow-[inset_2px_2px_5px_var(--shadow-dark)] dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.5)]"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>{isVietnamese ? "Sửa" : "Edit"}</span>
                  </button>
                )}

                {/* Inset Count Pill */}
                <span className="inline-flex h-8 items-center gap-1.5 rounded-[11px] bg-primary/[0.08] px-2.5 font-mono text-xs font-extrabold text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-primary/15 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                  <ShieldCheck size={13} />
                  {displayOfficers.length}
                </span>
              </div>
            </div>

            {/* Officer Cards List */}
            <div className="flex flex-1 flex-col gap-3.5">
              {displayOfficers.length > 0 ? (
                displayOfficers.map((officer, index) => (
                  <article
                    key={`${officer.name}-${index}`}
                    className="rounded-[18px] border border-white/60 bg-surface p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.85)] transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] dark:bg-card dark:shadow-[5px_5px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.025)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        {/* Debossed Avatar Pod */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-primary/[0.08] text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-primary/15 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                          <User size={17} />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="truncate text-sm font-extrabold text-foreground">
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
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/60 bg-surface text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
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
                              className="flex min-w-0 items-center gap-2.5 rounded-[13px] bg-background/65 px-3 py-2 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.7),inset_-1px_-1px_3px_rgba(255,255,255,0.03)]"
                            >
                              <Phone size={14} className="shrink-0 text-primary" />
                              <PhoneReveal
                                phoneNumber={phone}
                                isVietnamese={isVietnamese}
                                href={`tel:${phone}`}
                                onCopy={handleCopyPhone}
                                isCopied={isCopied}
                                className="flex-1 justify-between"
                                iconSize={13}
                                buttonClassName="size-7"
                                textClassName="min-w-0 flex-1 truncate font-mono text-sm font-bold tabular-nums text-foreground transition-colors hover:text-primary"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <div className="flex min-h-36 flex-1 flex-col items-center justify-center rounded-[18px] bg-background/60 px-4 py-8 text-center shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7)]">
                  <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface text-muted-foreground/60 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.5)]">
                    <Users size={20} />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground">
                    {isVietnamese
                      ? "Chưa có thông tin chỉ huy an toàn"
                      : "No safety team information"}
                  </p>
                  {onEditSite && (
                    <button
                      type="button"
                      onClick={onEditSite}
                      className="mt-3.5 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-[12px] border border-white/70 bg-surface px-3.5 text-xs font-bold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] transition-all hover:brightness-105 active:shadow-[inset_2px_2px_5px_var(--shadow-dark)] dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.5)]"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>{isVietnamese ? "Phân công cán bộ" : "Assign Officers"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recessed Footer Note */}
          <div className="mt-4 flex items-center gap-2.5 rounded-[14px] bg-primary/[0.06] px-3.5 py-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-primary/[0.08] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
            <ShieldCheck size={15} className="shrink-0 text-primary" />
            <p className="text-[11.5px] font-medium leading-relaxed text-muted-foreground">
              {isVietnamese
                ? "Liên hệ trực tiếp để xử lý vấn đề an toàn tại chỗ."
                : "Contact the team for on-site safety issues."}
            </p>
          </div>
        </section>

        {/* =====================================================
        2. DANH BẠ KHẨN CẤP NGOẠI VI
    ===================================================== */}
        <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
          <div>
            {/* Header */}
            <div className="relative mb-4 flex items-center justify-between gap-3 pb-4 before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-danger/40 before:via-border/45 before:to-transparent">
              <div className="flex min-w-0 items-center gap-3.5">
                {/* Extruded Emergency Icon Pod */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-danger/20 bg-surface text-danger shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.03)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-danger/10 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                    <ShieldAlert size={17} strokeWidth={2.1} />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
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

              {/* Inset Emergency Pulse Badge */}
              <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-danger/10 px-3 text-[11px] font-extrabold text-danger shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-danger shadow-[0_0_6px_var(--danger)]" />
                {isVietnamese ? "Khẩn cấp" : "Emergency"}
              </span>
            </div>

            {/* Emergency Contact Cards */}
            <div className="flex flex-1 flex-col gap-3">
              {emergencyContacts.map((contact, index) => {
                const isCopied = copiedPhone === contact.phone;
                const ContactIcon = contact.icon;
                return (
                  <article
                    key={`${contact.name}-${index}`}
                    className="group flex min-w-0 items-center gap-3.5 rounded-[18px] border border-white/60 bg-surface p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.85)] transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] dark:bg-card dark:shadow-[5px_5px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.025)]"
                  >
                    {/* Inset Danger Icon Pod */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-danger/10 text-danger shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                      <ContactIcon size={18} strokeWidth={2} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-foreground">
                        {contact.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                        {contact.type}
                      </p>
                      <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-background/60 px-2 py-0.5 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30">
                        <Phone size={11} className="shrink-0 text-danger" />
                        <PhoneReveal
                          key={`${contact.name}-${index}`}
                          phoneNumber={contact.phone}
                          isVietnamese={isVietnamese}
                          href={`tel:${contact.phone}`}
                          onCopy={handleCopyPhone}
                          isCopied={isCopied}
                          iconSize={12}
                          buttonClassName="size-6"
                          textClassName="truncate font-mono text-xs font-black tabular-nums text-danger hover:opacity-80"
                        />
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex shrink-0 items-center gap-2">
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-danger px-3 text-xs font-extrabold text-white shadow-[3px_3px_9px_rgba(239,68,68,0.38),-2px_-2px_6px_rgba(255,255,255,0.6)] transition-all hover:brightness-105 active:scale-[0.97] dark:shadow-[3px_3px_10px_rgba(0,0,0,0.6)]"
                      >
                        <PhoneCall size={13} />
                        <span>{isVietnamese ? "Gọi" : "Call"}</span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Recessed Footer Note */}
          <div className="mt-4 flex items-center gap-2.5 rounded-[14px] bg-danger/[0.06] px-3.5 py-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-danger/[0.09] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
            <ShieldAlert size={15} className="shrink-0 text-danger" />
            <p className="text-[11.5px] font-medium leading-relaxed text-muted-foreground">
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
        <section className="space-y-5 rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
          {/* Section Header + Assign Control */}
          <div className="relative flex flex-col gap-4 pb-4 before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-border/45 before:to-transparent sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              {/* Extruded Icon Pod */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/70 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.03)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                  <ShieldCheck size={17} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
                  {isVietnamese
                    ? "Tài khoản Hệ thống Được phân quyền Công trường"
                    : "Authorized System Personnel (Site Access)"}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isVietnamese
                    ? `Các tài khoản có quyền truy cập và vận hành dữ liệu thuộc công trường ${site.code}.`
                    : `System user accounts granted operational access to ${site.code}.`}
                </p>
              </div>
            </div>

            {/* Recessed Assign Bar */}
            {canUpdateUsers && unassignedUsers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-[16px] bg-background/60 p-1.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7)]">
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    aria-label={isVietnamese ? "Chọn người dùng" : "Select user"}
                    className="h-9 w-full max-w-[260px] cursor-pointer appearance-none rounded-[12px] border border-white/60 bg-surface py-1.5 pl-3 pr-8 text-xs font-bold text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] focus:border-primary/40 focus:outline-none dark:border-white/[0.06] dark:bg-card dark:shadow-[2px_2px_6px_rgba(0,0,0,0.55)]"
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
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>

                <button
                  type="button"
                  disabled={!selectedUserId || assignSitesMutation.isPending}
                  onClick={() => void handleAssignUser()}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] bg-primary px-3.5 text-xs font-extrabold text-primary-foreground shadow-[3px_3px_9px_rgba(var(--primary-rgb),0.35),-2px_-2px_6px_rgba(255,255,255,0.7)] transition-all hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:shadow-[3px_3px_10px_rgba(0,0,0,0.6)]"
                >
                  {assignSitesMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  <span>{isVietnamese ? "Cấp quyền" : "Assign"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Assigned Users Grid */}
          {usersLoading ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-[18px] border border-white/50 bg-surface shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.8)] dark:border-white/[0.04] dark:bg-card"
                />
              ))}
            </div>
          ) : assignedUsers.length === 0 ? (
            <div className="rounded-[18px] bg-background/60 p-7 text-center text-xs font-medium leading-relaxed text-muted-foreground shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7)]">
              {isVietnamese
                ? "Chưa có tài khoản nhân sự nào được gắn trực tiếp công trường này (Quản trị viên Admin mặc định có toàn quyền truy cập)."
                : "No users explicitly assigned to this site yet (Admins have global access by default)."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {assignedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-start justify-between gap-3 rounded-[18px] border border-white/60 bg-surface p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.85)] transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] dark:bg-card dark:shadow-[5px_5px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.025)]"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/users/${u.id}`}
                        className="truncate text-xs font-extrabold text-foreground transition-colors hover:text-primary"
                      >
                        {u.fullName || u.email}
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-extrabold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.75)] dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)] ${u.isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-danger/10 text-danger"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-primary" : "bg-danger"
                            }`}
                        />
                        {u.isActive ? "ACTIVE" : "LOCKED"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded-md bg-background/65 px-2 py-0.5 font-mono text-[10px] font-bold text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark)] dark:bg-black/30">
                        {u.role?.name || "USER"}
                      </span>
                      {u.phoneNumber && (
                        <PhoneReveal
                          key={u.id}
                          phoneNumber={u.phoneNumber}
                          isVietnamese={isVietnamese}
                          iconSize={12}
                          buttonClassName="size-6"
                          textClassName="font-mono text-[10.5px] font-semibold text-foreground"
                        />
                      )}
                    </div>

                    {u.email && (
                      <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0 text-primary/70" />
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
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/60 bg-surface text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] transition-all hover:text-danger active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] disabled:opacity-50 dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
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
