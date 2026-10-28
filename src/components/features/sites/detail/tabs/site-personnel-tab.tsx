"use client";

import { useState } from "react";
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
import type { SiteItem } from "@/types";

export interface SitePersonnelTabProps {
  site: SiteItem;
}

export function SitePersonnelTab({ site }: SitePersonnelTabProps) {
  const { t } = useLocale();
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const officers = site.contactOfficers || [];

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.success(`Đã sao chép số điện thoại ${phone}`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const emergencyContacts = [
    {
      name: "Trung tâm Cấp cứu 115",
      type: "Y tế & Cấp cứu khẩn cấp quốc gia",
      phone: "115",
      icon: <Ambulance className="h-5 w-5 text-rose-500" />,
      priority: "CRITICAL",
    },
    {
      name: "Đội Cảnh sát PCCC & CNCH",
      type: "Phòng cháy chữa cháy & Cứu hộ cứu nạn",
      phone: "114",
      icon: <Flame className="h-5 w-5 text-amber-500" />,
      priority: "CRITICAL",
    },
    ...(site.contactPhone
      ? [
          {
            name: `Hotline Công trường (${site.name})`,
            type: "Số điện thoại liên hệ chính",
            phone: site.contactPhone,
            icon: <ShieldAlert className="h-5 w-5 text-primary" />,
            priority: "HIGH",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* 2-column layout: Safety Officers on Left, External Hotlines on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Ban Chỉ Huy An Toàn Tại Chỗ */}
        <div className="space-y-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Ban Chỉ Huy & Cán Bộ Phụ Trách An Toàn
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Nhân sự chịu trách nhiệm pháp lý và điều hành PPE tại hiện trường
                </p>
              </div>
            </div>

            <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono">
              {officers.length || (site.contactPerson ? 1 : 0)} cán bộ
            </span>
          </div>

          {/* Officers List */}
          {officers.length > 0 ? (
            <div className="space-y-3">
              {officers.map((officer, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/30 bg-surface-elevated/40 p-3.5 space-y-2 dark:border-black/40 dark:bg-background/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          {officer.name}
                        </h4>
                        <span className="text-[10px] text-primary font-semibold">
                          {officer.roleTitle || "Cán bộ phụ trách"}
                        </span>
                      </div>
                    </div>

                    <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground border border-border/30">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Multiple Phone numbers */}
                  {officer.phones && officer.phones.length > 0 && (
                    <div className="pt-2 border-t border-border/20 space-y-1.5 pl-9">
                      {officer.phones.map((phone, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex items-center justify-between text-xs"
                        >
                          <a
                            href={`tel:${phone}`}
                            className="flex items-center gap-1.5 font-mono text-muted-foreground hover:text-primary transition"
                          >
                            <PhoneCall className="h-3 w-3 text-primary/70" />
                            <span>{phone}</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyPhone(phone)}
                            className="p-1 text-muted-foreground hover:text-foreground transition rounded"
                            title="Sao chép số"
                          >
                            {copiedPhone === phone ? (
                              <Check className="h-3 w-3 text-primary" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : site.contactPerson ? (
            <div className="rounded-xl border border-border/30 bg-surface-elevated/40 p-3.5 space-y-2 dark:border-black/40 dark:bg-background/40">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground">
                  {site.contactPerson}
                </h4>
              </div>
              {site.contactPhone && (
                <div className="flex items-center justify-between text-xs pl-6">
                  <a
                    href={`tel:${site.contactPhone}`}
                    className="flex items-center gap-1.5 font-mono text-muted-foreground hover:text-primary"
                  >
                    <Phone className="h-3 w-3 text-primary/70" />
                    <span>{site.contactPhone}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(site.contactPhone!)}
                    className="p-1 text-muted-foreground hover:text-foreground transition"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic py-6 text-center">
              Chưa có cán bộ phụ trách an toàn nào được chỉ định cho công trường này.
            </p>
          )}
        </div>

        {/* 2. Danh Bạ Khẩn Cấp Ngoại Vi */}
        <div className="space-y-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Danh Bạ Cấp Cứu & Khẩn Cấp Ngoại Vi
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Số hotline điều động lực lượng ứng cứu khi xảy ra tai nạn nghiêm trọng
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {emergencyContacts.map((contact, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-border/30 bg-surface-elevated/40 p-3.5 transition hover:border-border/60 dark:border-black/40 dark:bg-background/40"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface shadow-sm">
                    {contact.icon}
                  </span>

                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      {contact.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {contact.type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-1 text-xs font-mono font-bold hover:bg-rose-500 hover:text-white transition"
                  >
                    <Phone className="h-3 w-3" />
                    <span>{contact.phone}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyPhone(contact.phone)}
                    className="p-1 text-muted-foreground hover:text-foreground transition rounded"
                    title="Sao chép số"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
