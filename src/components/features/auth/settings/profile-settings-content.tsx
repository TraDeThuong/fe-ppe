"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  Mail,
  Phone,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { useAvatarUpload, useUpdateProfile } from "@/hooks/auth/use-profile";
import { ROLE_LABELS } from "@/config/navigation";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@ui/button";
import { Typography } from "@ui/typography";
import { toast } from "@/lib/toast";

const ROLE_DESCRIPTIONS: Record<string, { vi: string; en: string }> = {
  ADMIN: {
    vi: "Toàn quyền quản trị hệ thống, quản lý người dùng, phân quyền RBAC và giám sát thiết bị.",
    en: "Full system administration, user management, RBAC configuration, and device monitoring.",
  },
  SAFETY_MANAGER: {
    vi: "Quản lý an toàn lao động công trường, điều phối xử lý sự cố PPE và xem báo cáo phân tích.",
    en: "Site safety management, PPE incident coordination, and analytical report viewing.",
  },
  SAFETY_OFFICER: {
    vi: "Cán bộ giám sát an toàn hiện trường, ghi nhận sự cố và xử lý cảnh báo vi phạm thời gian thực.",
    en: "Field safety officer, incident recording, and real-time PPE violation handling.",
  },
  MANAGER: {
    vi: "Quản lý điều hành dự án, giám sát tổng quan chỉ số an toàn và tiến độ công trường.",
    en: "Operations manager, safety metrics tracking, and site progress monitoring.",
  },
  USER: {
    vi: "Thành viên hiện trường, theo dõi hồ sơ cá nhân và nhận thông báo nhắc nhở an toàn PPE.",
    en: "Site member, personal profile tracking, and PPE safety notification recipient.",
  },
};

export function ProfileSettingsContent() {
  const { user } = useAuth();
  const { t, locale } = useLocale();

  const isVietnamese = locale === "vi-VN";

  // Form local state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [formError, setFormError] = useState<{ fullName?: string; phoneNumber?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const updateProfileMutation = useUpdateProfile();
  const avatarUploadMutation = useAvatarUpload();

  // Đồng bộ thông tin từ AuthContext vào form
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setPhoneNumber(user.phoneNumber || "");
    }
  }, [user]);

  if (!user) {
    return (
      <div
        data-testid="profile-skeleton"
        aria-busy="true"
        className="flex min-h-[50vh] items-center justify-center bg-background px-4"
      >
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const isDirty =
    fullName.trim() !== (user.fullName || "").trim() ||
    phoneNumber.trim() !== (user.phoneNumber || "").trim();

  // Xử lý sao chép User ID
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      toast.success(t("profile.identity.copied"));
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error("Không thể sao chép ID vào clipboard");
    }
  };

  // Reset form về giá trị ban đầu
  const handleResetForm = () => {
    setFullName(user.fullName || "");
    setPhoneNumber(user.phoneNumber || "");
    setFormError({});
  };

  // Submit form cập nhật họ tên, SĐT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { fullName?: string; phoneNumber?: string } = {};

    const cleanName = fullName.trim();
    if (!cleanName) {
      errors.fullName = t("profile.personalInfo.fullNameRequired");
    }

    const cleanPhone = phoneNumber.trim();
    if (cleanPhone) {
      // Validate SĐT Việt Nam: 10-11 số
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(cleanPhone)) {
        errors.phoneNumber = t("profile.personalInfo.phoneInvalid");
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormError(errors);
      return;
    }

    setFormError({});

    updateProfileMutation.mutate({
      fullName: cleanName,
      phoneNumber: cleanPhone || undefined,
    });
  };

  // Xử lý chọn ảnh avatar
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input để chọn lại file cùng tên nếu cần
    e.target.value = "";

    // Kiểm tra định dạng
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validMimes.includes(file.type)) {
      toast.error(t("profile.avatar.typeError"));
      return;
    }

    // Kiểm tra dung lượng: tối đa 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("profile.avatar.sizeError"));
      return;
    }

    avatarUploadMutation.mutate(file);
  };

  const initials = (user.fullName || user.email || "U")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  const roleLabelKey = ROLE_LABELS[user.role] ?? "roles.USER";
  const roleDesc =
    ROLE_DESCRIPTIONS[user.role]?.[isVietnamese ? "vi" : "en"] ||
    ROLE_DESCRIPTIONS.USER[isVietnamese ? "vi" : "en"];

  // Format ngày tạo tài khoản
  let formattedJoinDate = "";
  try {
    const date = new Date(user.createdAt);
    formattedJoinDate = new Intl.DateTimeFormat(isVietnamese ? "vi-VN" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    formattedJoinDate = user.createdAt;
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        icon={UserRound}
        title={t("profile.title")}
        description={t("profile.subtitle")}
        badge={t("profile.badge")}
        badgeIcon={Sparkles}
        breadcrumbs={[
          { label: t("nav.settings") || "Cài đặt tài khoản" },
          { label: t("profile.title") },
        ]}
      />

      {/* 2. Settings Tab Navigation Bar */}
      <nav
        aria-label="Cài đặt phân mục"
        className="flex items-center gap-2 rounded-2xl border border-border/30 bg-background p-2 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
      >
        <Link
          href="/settings/profile"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--shadow-dark)]/15 bg-background px-4 py-2.5 text-xs font-semibold text-primary shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] transition-all sm:text-sm"
        >
          <UserRound className="size-4 shrink-0" />
          <span>{t("profile.tab.profile")}</span>
        </Link>

        <Link
          href="/settings/security"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-border/40 hover:bg-background hover:text-foreground hover:shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] sm:text-sm"
        >
          <ShieldCheck className="size-4 shrink-0" />
          <span>{t("profile.tab.security")}</span>
        </Link>
      </nav>

      {/* 3. Hero Identity & Avatar Banner */}
      <section className="rounded-2xl border border-border/30 bg-background p-3.5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-5">
        <div className="rounded-xl border border-border/20 bg-background p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-6">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            {/* Avatar & Uploader — Circular & Highly Elevated Neumorphism */}
            <div className="relative group shrink-0">
              {/* Outer Raised Pedestal (Nổi lồi cao) */}
              <div
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
                className="relative flex size-28 sm:size-32 cursor-pointer items-center justify-center rounded-full border-2 border-white/60 dark:border-white/10 bg-background p-1.5 shadow-[12px_12px_24px_var(--shadow-dark),-12px_-12px_24px_var(--shadow-light)] transition-all duration-300 hover:shadow-[14px_14px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)] hover:scale-[1.03] active:scale-[0.98]"
                title={t("profile.avatar.change")}
              >
                {/* Inner Beveled Ring for 3D depth */}
                <div className="relative size-full rounded-full overflow-hidden border border-border/40 bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || "Avatar"}
                      className="size-full rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-2xl sm:text-3xl font-black text-white shadow-inner select-none tracking-wider">
                      <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                        {initials}
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay with Camera Icon */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/45 backdrop-blur-[2px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 text-white">
                    <Camera className="size-5 sm:size-6 drop-shadow" />
                    <span className="mt-1 text-[10px] sm:text-[11px] font-semibold drop-shadow">
                      {t("profile.avatar.change") || "Đổi ảnh"}
                    </span>
                  </div>

                  {/* Upload loading overlay */}
                  {avatarUploadMutation.isPending && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-background/85 backdrop-blur-md">
                      <Loader2 className="size-7 animate-spin text-primary" />
                      <span className="mt-1 text-[10px] font-semibold text-primary">
                        {t("profile.avatar.uploading")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Online indicator beacon with pulsing ring */}
              <div
                title={t("profile.identity.statusActive")}
                className="absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 z-10 flex size-4 items-center justify-center pointer-events-none"
              >
                <span className="absolute size-full animate-ping rounded-full bg-emerald-400/50 duration-1000" />
                <span className="relative size-3.5 rounded-full border-2 border-background bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>

              {/* Camera Trigger Button — Circular Floating Action Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={avatarUploadMutation.isPending}
                aria-label={t("profile.avatar.change")}
                title={t("profile.avatar.change")}
                className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 z-10 flex size-10 items-center justify-center rounded-full border border-border/60 bg-background text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all duration-200 hover:scale-110 hover:text-primary hover:border-primary/50 hover:shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] active:scale-95 active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] disabled:opacity-50"
              >
                <Camera className="size-4.5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarFileChange}
                className="hidden"
                aria-hidden="true"
              />
            </div>

            {/* Profile Identity Details */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Typography
                  as="h1"
                  variant="embossed"
                  className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                >
                  {user.fullName || user.email}
                </Typography>

                {/* Role Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-xs font-semibold text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]">
                  <ShieldCheck className="size-3.5" />
                  {t(roleLabelKey)}
                </span>

                {/* Verified Email Badge */}
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  {t("profile.identity.emailVerified")}
                </span>
              </div>

              <p className="text-xs text-muted-foreground sm:text-sm">
                {user.email}
              </p>

              {/* Meta tags */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-muted-foreground sm:justify-start">
                {/* User ID copy */}
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/30 bg-muted/20 px-2.5 py-1">
                  <span className="font-mono text-[11px] text-foreground/80">
                    ID: {user.id.slice(0, 8)}...{user.id.slice(-4)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    title={t("profile.identity.copyId")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {copiedId ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>

                {/* Created At */}
                <div className="inline-flex items-center gap-1 text-[11px]">
                  <span>{t("profile.identity.joinedAt")}:</span>
                  <span className="font-medium text-foreground">
                    {formattedJoinDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Grid Layout: Personal Info Form + RBAC & Security Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form Chỉnh sửa thông tin cá nhân (7 cols) */}
        <div className="lg:col-span-7">
          <section className="h-full rounded-2xl border border-border/30 bg-background p-3.5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-5">
            <div className="flex h-full flex-col rounded-xl border border-border/20 bg-background p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-6">
              {/* Header section */}
              <div className="mb-5 border-b border-border/30 pb-3">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">
                    {t("profile.personalInfo.title")}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("profile.personalInfo.subtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Họ và tên */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="profile-fullName"
                      className="block text-xs font-semibold text-foreground"
                    >
                      {t("profile.personalInfo.fullName")}{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <User className="size-4" />
                      </div>
                      <input
                        id="profile-fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (formError.fullName) setFormError((prev) => ({ ...prev, fullName: undefined }));
                        }}
                        placeholder={t("profile.personalInfo.fullNamePlaceholder")}
                        className="w-full rounded-xl border border-border/40 bg-background py-2.5 pl-9 pr-3 text-sm text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    {formError.fullName && (
                      <p className="text-xs text-destructive">{formError.fullName}</p>
                    )}
                  </div>

                  {/* Số điện thoại */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="profile-phoneNumber"
                      className="block text-xs font-semibold text-foreground"
                    >
                      {t("profile.personalInfo.phoneNumber")}
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Phone className="size-4" />
                      </div>
                      <input
                        id="profile-phoneNumber"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (formError.phoneNumber) setFormError((prev) => ({ ...prev, phoneNumber: undefined }));
                        }}
                        placeholder={t("profile.personalInfo.phonePlaceholder")}
                        className="w-full rounded-xl border border-border/40 bg-background py-2.5 pl-9 pr-3 text-sm text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    {formError.phoneNumber && (
                      <p className="text-xs text-destructive">{formError.phoneNumber}</p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="profile-email"
                        className="block text-xs font-semibold text-foreground"
                      >
                        {t("profile.personalInfo.email")}
                      </label>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <Lock className="size-3" />
                        {t("profile.identity.emailVerified")}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Mail className="size-4" />
                      </div>
                      <input
                        id="profile-email"
                        type="email"
                        value={user.email || ""}
                        disabled
                        readOnly
                        className="w-full cursor-not-allowed rounded-xl border border-border/30 bg-muted/20 py-2.5 pl-9 pr-3 text-sm text-muted-foreground opacity-90 shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {t("profile.personalInfo.emailLockedHint")}
                    </p>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-border/30">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResetForm}
                    disabled={!isDirty || updateProfileMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl border border-transparent px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/30 hover:text-foreground active:shadow-nm-pressed disabled:opacity-40"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>{t("profile.personalInfo.reset")}</span>
                  </Button>

                  <Button
                    type="submit"
                    disabled={!isDirty || updateProfileMutation.isPending}
                    className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] transition-all hover:brightness-105 active:shadow-nm-pressed disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>{t("profile.personalInfo.saving")}</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        <span>{t("profile.personalInfo.save")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* Right Column: Phân quyền RBAC & Lối tắt bảo mật (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Card Phân quyền RBAC */}
          <section className="rounded-2xl border border-border/30 bg-background p-3.5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-5">
            <div className="rounded-xl border border-border/20 bg-background p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-5">
              <div className="mb-4 flex items-center justify-between border-b border-border/30 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    {t("profile.rbac.title")}
                  </h3>
                </div>
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {user.permissions.length} {t("profile.rbac.permissionsCount")}
                </span>
              </div>

              {/* Role info */}
              <div className="space-y-3">
                <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("profile.rbac.currentRole")}
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {t(roleLabelKey)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {roleDesc}
                  </p>
                </div>

                {/* Permissions chip list */}
                <div>
                  <p className="mb-2 text-xs font-semibold text-foreground">
                    {t("profile.rbac.permissionsList")}
                  </p>
                  <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {user.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded-lg border border-border/40 bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground shadow-[1px_1px_3px_var(--shadow-dark)]"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Security notice */}
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    {t("profile.rbac.notice")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Card Lối tắt An toàn & Bảo mật */}
          <section className="rounded-2xl border border-border/30 bg-background p-3.5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-5">
            <div className="rounded-xl border border-border/20 bg-background p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-5">
              <div className="mb-3 flex items-center justify-between border-b border-border/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    {t("profile.security.title")}
                  </h3>
                </div>
                <Link
                  href="/settings/security"
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  <span>{t("profile.security.manage")}</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {/* 2FA */}
                <Link
                  href="/settings/security"
                  className="group flex items-center justify-between rounded-xl border border-border/30 bg-background p-2.5 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary">
                        {t("profile.security.twoFactorTitle")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("profile.security.twoFactorDesc")}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      user.twoFactorEnabled
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {user.twoFactorEnabled ? t("security.2fa.statusOn") : t("security.2fa.statusOff")}
                  </span>
                </Link>

                {/* Đổi mật khẩu */}
                <Link
                  href="/change-password"
                  className="group flex items-center justify-between rounded-xl border border-border/30 bg-background p-2.5 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <KeyRound className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary">
                        {t("profile.security.passwordTitle")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("profile.security.passwordDesc")}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary" />
                </Link>

                {/* Quản lý phiên */}
                <Link
                  href="/settings/security"
                  className="group flex items-center justify-between rounded-xl border border-border/30 bg-background p-2.5 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Laptop className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary">
                        {t("profile.security.sessionsTitle")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("profile.security.sessionsDesc")}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
