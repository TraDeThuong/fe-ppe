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
import { SettingsTabNav } from "./settings-tab-nav";

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

      {/* 2. Settings Tab Navigation Bar (SegmentedControl) */}
      <SettingsTabNav />

      {/* 3. Hero Identity & Avatar Banner */}
      <section className="rounded-2xl border border-border/30 bg-background p-3.5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-5">
        <div className="rounded-xl border border-border/20 bg-background p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-6">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            {/* Avatar & Uploader — Circular & Highly Elevated Neumorphism */}
            <div className="relative group shrink-0">
              {/* Outer Raised Pedestal (Nổi lồi cao với 2 vòng tròn đồng tâm 3D) */}
              <div
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
                className="relative flex size-28 sm:size-32 cursor-pointer items-center justify-center rounded-full border border-border/40 bg-background p-1.5 shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] active:scale-[0.98]"
                title={t("profile.avatar.change")}
              >
                {/* Intermediate Beveled Contour Ring */}
                <div className="relative flex size-full items-center justify-center rounded-full p-1 bg-gradient-to-br from-white/30 via-transparent to-black/15 dark:from-white/10 dark:to-black/35 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.4),inset_-1px_-1px_2px_rgba(0,0,0,0.3)]">
                  {/* Inner Avatar Container */}
                  <div className="relative size-full rounded-full overflow-hidden border border-border/30 bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || "Avatar"}
                        className="size-full rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-primary to-orange-600 text-2xl sm:text-3xl font-black text-white select-none tracking-wider">
                        <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
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
                className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 z-10 flex size-10 items-center justify-center rounded-full border border-border/60 bg-background text-foreground shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] transition-all duration-200 hover:scale-110 hover:text-primary hover:border-primary/50 hover:shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)] active:scale-95 active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] disabled:opacity-50"
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
        
<div className="lg:col-span-5">
  <section
    className="
      relative h-full overflow-hidden rounded-[28px]
      border border-border/30 bg-background
      shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]
    "
  >
    {/* Top highlight */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-8 top-0 h-px bg-foreground/10"
    />

    <div className="flex h-full flex-col p-5 sm:p-7 lg:p-8">
      {/* Header */}
      <div className="mb-7 flex items-start gap-4">
        <div
          className="
            flex size-12 shrink-0 items-center justify-center
            rounded-2xl border border-border/30 bg-background
            text-primary
            shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]
          "
        >
          <User className="size-5" strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {t("profile.personalInfo.title")}
            </h2>

            <span
              className="
                inline-flex items-center gap-1.5 rounded-full
                border border-border/30 bg-background/70
                px-2.5 py-1 text-[10px] font-semibold
                uppercase tracking-wider text-muted-foreground
              "
            >
              <span className="size-1.5 rounded-full bg-primary" />
              Profile
            </span>
          </div>

          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {t("profile.personalInfo.subtitle")}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mb-6 h-px bg-border/40" />

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col justify-between gap-8"
      >
        <div className="space-y-6">
          {/* Full name */}
          <div className="space-y-2">
            <label
              htmlFor="profile-fullName"
              className="flex items-center gap-1 text-xs font-semibold text-foreground"
            >
              {t("profile.personalInfo.fullName")}
              <span className="text-destructive">*</span>
            </label>

            <div className="group relative">
              <User
                aria-hidden="true"
                className="
                  pointer-events-none absolute left-3.5 top-1/2
                  size-[17px] -translate-y-1/2
                  text-muted-foreground transition-colors
                  group-focus-within:text-primary
                "
              />

              <input
                id="profile-fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (formError.fullName) {
                    setFormError((prev) => ({
                      ...prev,
                      fullName: undefined,
                    }));
                  }
                }}
                placeholder={t("profile.personalInfo.fullNamePlaceholder")}
                aria-invalid={!!formError.fullName}
                aria-describedby={
                  formError.fullName ? "profile-fullName-error" : undefined
                }
                className="
                  w-full rounded-2xl border border-border/40
                  bg-background py-3.5 pl-11 pr-4
                  text-sm text-foreground
                  shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]
                  outline-none transition-all duration-200
                  placeholder:text-muted-foreground/55
                  hover:border-border/70
                  focus:border-primary/60
                  focus:ring-2 focus:ring-primary/15
                  focus:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]
                  aria-[invalid=true]:border-destructive/70
                  aria-[invalid=true]:focus:ring-destructive/15
                "
              />
            </div>

            {formError.fullName && (
              <p
                id="profile-fullName-error"
                role="alert"
                className="flex items-center gap-1.5 text-xs text-destructive"
              >
                <span className="size-1 rounded-full bg-destructive" />
                {formError.fullName}
              </p>
            )}
          </div>

          {/* Phone number */}
          <div className="space-y-2">
            <label
              htmlFor="profile-phoneNumber"
              className="block text-xs font-semibold text-foreground"
            >
              {t("profile.personalInfo.phoneNumber")}
            </label>

            <div className="group relative">
              <Phone
                aria-hidden="true"
                className="
                  pointer-events-none absolute left-3.5 top-1/2
                  size-[17px] -translate-y-1/2
                  text-muted-foreground transition-colors
                  group-focus-within:text-primary
                "
              />

              <input
                id="profile-phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (formError.phoneNumber) {
                    setFormError((prev) => ({
                      ...prev,
                      phoneNumber: undefined,
                    }));
                  }
                }}
                // placeholder={t("profile.personalInfo.phonePlaceholder")}
                aria-invalid={!!formError.phoneNumber}
                aria-describedby={
                  formError.phoneNumber
                    ? "profile-phoneNumber-error"
                    : undefined
                }
                className="
                  w-full rounded-2xl border border-border/40
                  bg-background py-3.5 pl-11 pr-4
                  text-sm text-foreground
                  shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]
                  outline-none transition-all duration-200
                  placeholder:text-muted-foreground/55
                  hover:border-border/70
                  focus:border-primary/60
                  focus:ring-2 focus:ring-primary/15
                  aria-[invalid=true]:border-destructive/70
                  aria-[invalid=true]:focus:ring-destructive/15
                "
              />
            </div>

            {formError.phoneNumber && (
              <p
                id="profile-phoneNumber-error"
                role="alert"
                className="flex items-center gap-1.5 text-xs text-destructive"
              >
                <span className="size-1 rounded-full bg-destructive" />
                {formError.phoneNumber}
              </p>
            )}
          </div>

          {/* Email - Read only */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="profile-email"
                className="text-xs font-semibold text-foreground"
              >
                {t("profile.personalInfo.email")}
              </label>

              <span
                className="
                  inline-flex items-center gap-1.5 rounded-full
                  border border-primary/20 bg-primary/5
                  px-2.5 py-1 text-[10px] font-semibold
                  text-primary
                "
              >
                <ShieldCheck className="size-3" />
                {t("profile.identity.emailVerified")}
              </span>
            </div>

            <div className="relative">
              <Mail
                aria-hidden="true"
                className="
                  pointer-events-none absolute left-3.5 top-1/2
                  size-[17px] -translate-y-1/2 text-muted-foreground/70
                "
              />

              <input
                id="profile-email"
                type="email"
                value={user.email || ""}
                disabled
                readOnly
                className="
                  w-full cursor-not-allowed rounded-2xl
                  border border-border/20 bg-muted/25
                  py-3.5 pl-11 pr-11 text-sm text-muted-foreground
                  shadow-[inset_2px_2px_5px_var(--shadow-dark)]
                  opacity-90
                "
              />

              <Lock
                aria-hidden="true"
                className="
                  pointer-events-none absolute right-3.5 top-1/2
                  size-3.5 -translate-y-1/2 text-muted-foreground/60
                "
              />
            </div>

            <p className="pl-1 text-[11px] leading-relaxed text-muted-foreground">
              {t("profile.personalInfo.emailLockedHint")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div
          className="
            mt-auto flex flex-col-reverse gap-3
            border-t border-border/30 pt-5
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            {isDirty ? (t("profile.personalInfo.reset")) : ""}
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetForm}
              disabled={!isDirty || updateProfileMutation.isPending}
              className="
                inline-flex items-center justify-center gap-2
                rounded-xl border border-border/30 bg-background
                px-4 py-2.5 text-xs font-semibold text-muted-foreground
                shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
                transition-all duration-200
                hover:text-foreground
                active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]
                disabled:cursor-not-allowed disabled:opacity-40
              "
            >
              <RotateCcw className="size-3.5" />
              <span>{t("profile.personalInfo.reset")}</span>
            </Button>

            <Button
              type="submit"
              disabled={!isDirty || updateProfileMutation.isPending}
              className="
                inline-flex items-center justify-center gap-2
                rounded-xl border border-primary/30
                bg-primary px-5 py-2.5
                text-xs font-bold text-primary-foreground
                shadow-[4px_4px_10px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]
                transition-all duration-200
                hover:-translate-y-0.5 hover:brightness-105
                hover:shadow-[6px_6px_13px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]
                active:translate-y-0 active:shadow-nm-pressed
                disabled:cursor-not-allowed disabled:opacity-45
              "
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
        </div>
      </form>
    </div>
  </section>
</div>


        {/* Right Column: Phân quyền RBAC & Lối tắt bảo mật (5 cols) */}
        <div className="space-y-6 lg:col-span-7">

{/* Card Phân quyền RBAC */}
<section
  className="
    relative overflow-hidden rounded-[28px]
    border border-border/30 bg-background p-5 sm:p-7
    shadow-[9px_9px_22px_var(--shadow-dark),-9px_-9px_22px_var(--shadow-light)]
  "
>
  {/* Top highlight */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-8 top-0 h-px bg-foreground/10"
  />

  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <div
          className="
            flex size-12 shrink-0 items-center justify-center
            rounded-2xl border border-primary/20 bg-primary/10
            text-primary
            shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]
          "
        >
          <ShieldCheck className="size-6" strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            {t("profile.rbac.title")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("profile.rbac.currentRole")}
          </p>
        </div>
      </div>

      <div
        className="
          flex shrink-0 items-center gap-2 rounded-xl
          border border-primary/20 bg-primary/5 px-3 py-2
          text-primary
          shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
        "
      >
        <span className="text-sm font-bold tabular-nums">
          {user.permissions.length}
        </span>
        <span className="hidden text-xs font-medium sm:inline">
          {t("profile.rbac.permissionsCount")}
        </span>
      </div>
    </div>

    <div className="h-px bg-border/40" />

    {/* Current role */}
    <div
      className="
        relative overflow-hidden rounded-2xl
        border border-primary/15 bg-primary/[0.045]
        p-4 sm:p-5
        shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
      "
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-12 size-36 rounded-full bg-primary/[0.06] blur-2xl"
      />

      <div className="relative flex items-start gap-3.5">

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t("profile.rbac.currentRole")}
          </p>

          <p className="mt-1.5 text-base font-bold tracking-tight text-primary sm:text-lg">
            {t(roleLabelKey)}
          </p>

          <p className="mt-2 text-xs leading-[1.8] text-muted-foreground sm:text-sm">
            {roleDesc}
          </p>
        </div>
      </div>
    </div>

    {/* Permissions */}
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">

          <h4 className="text-sm font-bold text-foreground">
            {t("profile.rbac.permissionsList")}
          </h4>
        </div>

        <span className="text-[11px] font-medium text-muted-foreground">
          {user.permissions.length}
        </span>
      </div>

      {user.permissions.length > 0 ? (
        <div
          className="
            flex max-h-44 flex-wrap gap-2 overflow-y-auto
            rounded-2xl border border-border/20 bg-muted/[0.08]
            p-3
            shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
          "
        >
          {user.permissions.map((perm) => (
            <span
              key={perm}
              className="
                inline-flex max-w-full items-center gap-2
                rounded-lg border border-border/30 bg-background
                px-2.5 py-1.5
                font-mono text-[10px] leading-relaxed text-muted-foreground
                break-all
                shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]
                transition-all duration-200
                hover:-translate-y-0.5 hover:border-primary/30
                hover:text-primary
              "
            >
              <span className="size-1.5 shrink-0 rounded-full bg-primary/70" />
              {perm}
            </span>
          ))}
        </div>
      ) : (
        <div
          className="
            rounded-2xl border border-border/30 bg-muted/10
            px-4 py-6 text-center
            shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
          "
        >
          <ShieldCheck className="mx-auto size-6 text-muted-foreground/50" />
          <p className="mt-2 text-xs text-muted-foreground">
            {t("profile.rbac.permissionsList")}
          </p>
        </div>
      )}
    </div>

    {/* Security notice */}
    <div
      className="
        relative flex items-start gap-3 overflow-hidden
        rounded-2xl border border-amber-500/20
        bg-amber-500/[0.045] p-3.5 sm:p-4
        shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]
      "
    >
      <div
        className="
          flex size-9 shrink-0 items-center justify-center
          rounded-xl border border-amber-500/20
          bg-amber-500/[0.08] text-amber-600
          dark:text-amber-400
          shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]
        "
      >
        <ShieldAlert className="size-[18px]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
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
