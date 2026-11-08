"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { RoleDto } from "@/types";
import {
  getRoleKnowledgeProfile,
  type RoleKnowledgeProfile,
} from "../../role-guide-data";

export interface RoleCapabilitiesTabProps {
  role: RoleDto;
}

export function RoleCapabilitiesTab({ role }: RoleCapabilitiesTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const profile: RoleKnowledgeProfile = useMemo(
    () => getRoleKnowledgeProfile(role, locale),
    [role, locale],
  );

  return (
    <div className="space-y-5">
      {/* ── 1. TRÁCH NHIỆM CỐT LÕI ───────────────────────────────────── */}
      <section className="rounded-2xl border border-white/80 bg-surface p-4 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)] space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px] font-bold">
            1
          </span>
          {t("roles.guide.coreResponsibilities")}
        </h3>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {profile.coreResponsibilities.map((resp, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-border/30 bg-background/55 p-3 text-xs shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span className="leading-relaxed text-foreground/90">{resp}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. BẢN ĐỒ PHẠM VI TRUY CẬP TRÊN 12 TRANG HỆ THỐNG ────────── */}
      <section className="rounded-2xl border border-white/80 bg-surface p-4 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px] font-bold">
              2
            </span>
            {t("roles.guide.pageCapabilities")}
          </h3>
          <span className="text-xs text-muted-foreground font-mono">
            {profile.pageCapabilities.length}{" "}
            {isVietnamese ? "trang chức năng" : "system routes"}
          </span>
        </div>

        <div className="space-y-2.5">
          {profile.pageCapabilities.map((page, idx) => {
            const PageIcon = page.icon;
            const isDenied = page.accessLevel === "none";

            return (
              <div
                key={idx}
                className={`rounded-xl border p-3.5 transition-all shadow-[inset_1px_1px_2px_var(--shadow-dark)] ${
                  isDenied
                    ? "border-border/30 bg-background/30 opacity-70"
                    : "border-border/40 bg-background/60 hover:bg-background/80"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface border border-border/40 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                      <PageIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground truncate">
                        {page.title}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                        {page.route}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDenied ? (
                      <Badge
                        variant="outline"
                        size="sm"
                        className="text-[10px] text-muted-foreground border-border/50"
                      >
                        <XCircle className="h-3 w-3 mr-1 text-muted-foreground" />
                        {page.accessLabel}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        size="sm"
                        className="text-[10px] text-primary border-primary/30 font-semibold"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1 text-primary" />
                        {page.accessLabel}
                      </Badge>
                    )}

                    {!isDenied && (
                      <Link href={page.route} target="_blank">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-primary hover:text-primary gap-1"
                        >
                          <span>{isVietnamese ? "Mở trang" : "Open"}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed pl-10">
                  {page.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. RÀO CHẮN AN NINH & NGUYÊN TẮC BẢO MẬT ──────────────────── */}
      <section className="rounded-2xl border border-white/80 bg-surface p-4 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)] space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px] font-bold">
            3
          </span>
          {t("roles.guide.securityGuardrails")}
        </h3>

        <div className="space-y-2">
          {profile.securityGuardrails.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-border/30 bg-background/40 p-3 text-xs text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span className="leading-relaxed">{rule}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
