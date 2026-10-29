"use client";

import { useState, useMemo } from "react";
import {
  Ambulance,
  Building,
  Check,
  Copy,
  Flame,
  Phone,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { SiteContactOfficer, SiteItem } from "@/types";

export interface SitePersonnelTabProps {
  site: SiteItem;
}

export function SitePersonnelTab({ site }: SitePersonnelTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const officers: SiteContactOfficer[] = useMemo(() => {
    if (!site.contactOfficers) return [];
    if (Array.isArray(site.contactOfficers)) return site.contactOfficers;
    if (typeof site.contactOfficers === "string") {
      try {
        const parsed = JSON.parse(site.contactOfficers);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [site.contactOfficers]);

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.success(
      isVietnamese
        ? `Đã sao chép số điện thoại ${phone}`
        : `Copied phone number ${phone}`
    );
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const emergencyContacts = [
    {
      name: isVietnamese ? "Trung tâm Cấp cứu 115" : "National Ambulance Center 115",
      type: isVietnamese ? "Y tế & Cấp cứu khẩn cấp quốc gia" : "National Medical Emergency Services",
      phone: "115",
      icon: Ambulance,
      priority: "CRITICAL",
    },
    {
      name: isVietnamese ? "Đội Cảnh sát PCCC & CNCH" : "Fire Rescue & Prevention Squad 114",
      type: isVietnamese ? "Phòng cháy chữa cháy & Cứu hộ cứu nạn" : "Fire Fighting, Search & Rescue Operations",
      phone: "114",
      icon: Flame,
      priority: "CRITICAL",
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
            priority: "HIGH",
          },
        ]
      : []),
  ];



return (
  <div className="space-y-5">
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      {/* =====================================================
          1. BAN CHỈ HUY AN TOÀN TẠI CHỖ
      ===================================================== */}
      <section
        className={[
          "relative flex min-w-0 flex-col overflow-hidden rounded-2xl p-4 sm:p-5",
          "border border-white/80 dark:border-white/5",
          "bg-background dark:bg-card",
          "shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.9)]",
          "dark:shadow-[8px_8px_18px_rgba(0,0,0,0.45),-3px_-3px_9px_rgba(255,255,255,0.025)]",
        ].join(" ")}
      >
        {/* Subtle top edge light reflection */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/10" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={[
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                "border border-white/70 dark:border-white/5",
                "bg-background text-primary dark:bg-card",
                "shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)]",
                "dark:shadow-[3px_3px_7px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.025)]",
              ].join(" ")}
            >
              <Users size={19} strokeWidth={2.1} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
                {isVietnamese
                  ? "Ban Chỉ Huy An Toàn"
                  : "On-site Safety Team"}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isVietnamese
                  ? "Đầu mối phụ trách tại công trường"
                  : "On-site safety contacts"}
              </p>
            </div>
          </div>

          <span
            className={[
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5",
              "border border-primary/15 bg-primary/[0.08] text-primary text-xs font-semibold",
              "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]",
              "dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.35),inset_-1px_-1px_3px_rgba(255,255,255,0.025)]",
            ].join(" ")}
          >
            <ShieldCheck size={13} />
            {officers.length}
          </span>
        </div>

        <div className="mb-4 h-px bg-gradient-to-r from-primary/30 via-border/50 to-transparent" />

        {/* Officers */}
        <div className="flex flex-1 flex-col gap-3">
          {officers.length > 0 ? (
            officers.map((officer, index) => (
              <article
                key={`${officer.name}-${index}`}
                className={[
                  "rounded-xl p-3",
                  "border border-white/80 dark:border-white/5",
                  "bg-background dark:bg-card",
                  "shadow-[4px_4px_9px_var(--shadow-dark),-3px_-3px_8px_rgba(255,255,255,0.9)]",
                  "dark:shadow-[4px_4px_9px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.025)]",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {officer.name}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {officer.roleTitle}
                    </p>
                  </div>
                </div>

                {officer.phones?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {officer.phones.map((phone, phoneIndex) => {
                      const isCopied = copiedPhone === phone;

                      return (
                        <div
                          key={`${phone}-${phoneIndex}`}
                          className={[
                            "flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2",
                            "bg-background/80 dark:bg-background/50",
                            "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]",
                            "dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.025)]",
                          ].join(" ")}
                        >
                          <Phone
                            size={14}
                            className="shrink-0 text-primary"
                          />

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
                              isVietnamese
                                ? "Sao chép số điện thoại"
                                : "Copy phone number"
                            }
                            className={[
                              "flex size-7 shrink-0 items-center justify-center rounded-lg",
                              "text-muted-foreground transition-all",
                              "hover:bg-primary/10 hover:text-primary",
                              "active:scale-95",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            ].join(" ")}
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
          ) : site.contactPerson ? (
            <article
              className={[
                "rounded-xl p-3",
                "border border-white/80 dark:border-white/5",
                "bg-background dark:bg-card",
                "shadow-[4px_4px_9px_var(--shadow-dark),-3px_-3px_8px_rgba(255,255,255,0.9)]",
                "dark:shadow-[4px_4px_9px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.025)]",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {site.contactPerson}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isVietnamese
                      ? "Người phụ trách công trường"
                      : "Site contact person"}
                  </p>
                </div>
              </div>

              {site.contactPhone && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-background/80 px-2.5 py-2 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-background/50 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.025)]">
                  <Phone size={14} className="shrink-0 text-primary" />
                  <a
                    href={`tel:${site.contactPhone}`}
                    className="min-w-0 flex-1 truncate text-sm font-semibold tabular-nums text-foreground hover:text-primary"
                  >
                    {site.contactPhone}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(site.contactPhone!)}
                    aria-label={
                      isVietnamese
                        ? "Sao chép số điện thoại"
                        : "Copy phone number"
                    }
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {copiedPhone === site.contactPhone ? (
                      <Check size={14} className="text-primary" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              )}
            </article>
          ) : (
            <div className="flex min-h-28 flex-1 flex-col items-center justify-center rounded-xl bg-background/40 px-4 py-6 text-center">
              <Users size={22} className="mb-2 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">
                {isVietnamese
                  ? "Chưa có thông tin chỉ huy an toàn"
                  : "No safety team information"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
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
          Bố cục gọn: danh sách ngang, giảm chiều cao mỗi liên hệ
      ===================================================== */}
      <section
        className={[
          "relative flex min-w-0 flex-col overflow-hidden rounded-2xl p-4 sm:p-5",
          "border border-white/80 dark:border-white/5",
          "bg-background dark:bg-card",
          "shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.9)]",
          "dark:shadow-[8px_8px_18px_rgba(0,0,0,0.45),-3px_-3px_9px_rgba(255,255,255,0.025)]",
        ].join(" ")}
      >
        {/* Subtle top edge light reflection */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/10" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={[
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                "border border-danger/20 bg-danger/10 text-danger",
                "shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)]",
                "dark:shadow-[3px_3px_7px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.025)]",
              ].join(" ")}
            >
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

        {/* Compact contacts */}
        <div className="flex flex-1 flex-col gap-2.5">
          {emergencyContacts.length > 0 ? (
            emergencyContacts.map((contact, index) => {
              const isCopied = copiedPhone === contact.phone;
              const ContactIcon = contact.icon;

              return (
                <article
                  key={`${contact.name}-${index}`}
                  className={[
                    "group flex min-w-0 items-center gap-3 rounded-xl p-3",
                    "border border-white/80 dark:border-white/5",
                    "bg-background dark:bg-card transition-all duration-200",
                    "shadow-[4px_4px_9px_var(--shadow-dark),-3px_-3px_8px_rgba(255,255,255,0.9)]",
                    "dark:shadow-[4px_4px_9px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.025)]",
                    "hover:shadow-[6px_6px_12px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,1)]",
                    "dark:hover:shadow-[6px_6px_12px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.03)]",
                  ].join(" ")}
                >
                  {/* Icon */}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                    <ContactIcon size={18} strokeWidth={2} />
                  </div>

                  {/* Contact information */}
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
                        className="truncate text-sm font-bold tabular-nums text-danger transition-colors hover:opacity-75"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  </div>

                  {/* Compact actions */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(contact.phone)}
                      aria-label={
                        isVietnamese
                          ? "Sao chép số điện thoại"
                          : "Copy phone number"
                      }
                      className={[
                        "flex size-8 items-center justify-center rounded-lg",
                        "text-muted-foreground transition-colors",
                        "hover:bg-danger/10 hover:text-danger",
                        "active:scale-95",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40",
                      ].join(" ")}
                    >
                      {isCopied ? (
                        <Check size={15} className="text-danger" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>

                    <a
                      href={`tel:${contact.phone}`}
                      aria-label={
                        isVietnamese
                          ? `Gọi ${contact.name}`
                          : `Call ${contact.name}`
                      }
                      className={[
                        "flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5",
                        "bg-danger text-white text-xs font-semibold",
                        "shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.45)]",
                        "transition-all hover:brightness-105 active:translate-y-px active:shadow-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      ].join(" ")}
                    >
                      <PhoneCall size={13} />
                      <span>{isVietnamese ? "Gọi" : "Call"}</span>
                    </a>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="flex min-h-28 flex-1 flex-col items-center justify-center rounded-xl bg-background/40 px-4 py-6 text-center">
              <ShieldAlert size={22} className="mb-2 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">
                {isVietnamese
                  ? "Chưa có danh bạ khẩn cấp"
                  : "No emergency contacts available"}
              </p>
            </div>
          )}
        </div>

        {/* Compact emergency note */}
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
  </div>
);
}