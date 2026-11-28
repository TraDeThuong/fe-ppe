"use client";

/**
 * Phần dùng chung cho 2 chế độ xem tab Sức khỏe (Bảng `SystemHealthMatrix` / Thẻ `SystemHealthCards`):
 * - Bộ lọc thống nhất: Tất cả / Dịch vụ / Hạ tầng / Cần chú ý (ISSUES) + ô tìm kiếm.
 * - Sao chép báo cáo gửi IT.
 * - Ngăn kéo chẩn đoán (playbook) khi bấm vào một dịch vụ.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Search, X } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import {
  buildSystemHealthSupportReport,
  formatServiceLatencyLabel,
  type ServiceGuidanceView,
} from "@/lib/system-health-guidance";
import { useLocale } from "@/providers/locale-provider";
import type { ServiceHealthItem, SystemHealthReport } from "@/types";

// ── Bộ lọc ────────────────────────────────────────────────────────────

export type SystemHealthFilter = "ALL" | "SERVICE" | "INFRASTRUCTURE" | "ISSUES";

export interface SystemHealthCounts {
  all: number;
  service: number;
  infra: number;
  issues: number;
}

export function countHealthServices(services: ServiceHealthItem[]): SystemHealthCounts {
  let service = 0;
  let infra = 0;
  let issues = 0;
  for (const item of services) {
    if (item.type === "INFRASTRUCTURE") infra++;
    else service++;
    if (item.status !== "HEALTHY") issues++;
  }
  return { all: services.length, service, infra, issues };
}

/** Khi hết sự cố, nút "Cần chú ý" biến mất → tự quay về "Tất cả" thay vì để danh sách trống. */
export function resolveHealthFilter(
  filter: SystemHealthFilter,
  counts: SystemHealthCounts,
): SystemHealthFilter {
  return filter === "ISSUES" && counts.issues === 0 ? "ALL" : filter;
}

export function filterHealthServices(
  services: ServiceHealthItem[],
  filter: SystemHealthFilter,
  search: string,
): ServiceHealthItem[] {
  const query = search.trim().toLowerCase();
  return services.filter((svc) => {
    const matchesFilter =
      filter === "ALL" ||
      (filter === "SERVICE" && (svc.type ?? "SERVICE") === "SERVICE") ||
      (filter === "INFRASTRUCTURE" && svc.type === "INFRASTRUCTURE") ||
      (filter === "ISSUES" && svc.status !== "HEALTHY");
    const matchesSearch =
      !query ||
      svc.name.toLowerCase().includes(query) ||
      svc.serviceCode.toLowerCase().includes(query) ||
      String(svc.port).includes(query);
    return matchesFilter && matchesSearch;
  });
}

/** State có thể điều khiển từ ngoài (giữ bộ lọc khi đổi Bảng ↔ Thẻ), hoặc tự quản lý khi dùng độc lập. */
export function useControllableState<T>(
  value: T | undefined,
  onChange: ((next: T) => void) | undefined,
  initial: T,
): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(initial);
  const isControlled = value !== undefined;
  const set = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [isControlled ? value : internal, set];
}

export function healthSearchPlaceholder(locale: string): string {
  return locale === "vi-VN"
    ? "Tìm kiếm node dịch vụ hoặc cổng..."
    : "Search service node or port...";
}

/** Ô tìm kiếm kiểu neumorphism cho chế độ Thẻ (chế độ Bảng giữ ô tìm kiếm sẵn có). */
export function HealthSearchInput({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { locale } = useLocale();
  const placeholder = healthSearchPlaceholder(locale);
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`h-8.5 w-full rounded-2xl border-0 bg-background pl-9 pr-3 text-[11px] font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${NM.recessed}`}
      />
    </div>
  );
}

// ── Sao chép báo cáo gửi IT ───────────────────────────────────────────

export function useSupportReportCopy(health: SystemHealthReport | undefined) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const copy = useCallback(async () => {
    if (!health || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(buildSystemHealthSupportReport(health, locale));
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard denial in restricted contexts.
    }
  }, [health, locale]);

  return { copied, copy };
}

// ── Ngăn kéo chẩn đoán ────────────────────────────────────────────────

export interface ServiceDiagnosticDrawerProps {
  service: ServiceHealthItem;
  guidance: ServiceGuidanceView;
  statusLabel: string;
  isAdmin: boolean;
  canCopyReport: boolean;
  copiedReport: boolean;
  onCopyReport: () => void;
  onClose: () => void;
  className?: string;
}

export function ServiceDiagnosticDrawer({
  service: selectedService,
  guidance: selectedGuidance,
  statusLabel,
  isAdmin,
  canCopyReport,
  copiedReport,
  onCopyReport,
  onClose,
  className = "",
}: ServiceDiagnosticDrawerProps) {
  const { t } = useLocale();

  return (
    <div
      role="region"
      aria-label={selectedService.name}
      className={`space-y-3 rounded-[20px] bg-background p-4 text-xs ${NM.recessed} ${className}`}
    >
      {/* Header ngăn kéo */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            <p className="truncate text-sm font-black text-foreground">
              {selectedService.name}
            </p>
          </div>
          {isAdmin && (
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {selectedService.serviceCode} · :{selectedService.port} ·{" "}
              {selectedService.endpoint}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-background text-muted-foreground transition-colors hover:text-foreground ${NM.tactileBtn}`}
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* 3 Ô thông số kỹ thuật nổi lên trên ngăn kéo */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 text-[11px]">
        <div className={`rounded-xl bg-background p-2.5 ${NM.extruded}`}>
          <span className="block text-[10px] font-semibold text-muted-foreground">
            {selectedService.status === "DOWN"
              ? t("dashboard.systemCard.probeDuration")
              : t("system.health.tableLatency")}
          </span>
          <span className="mt-0.5 block font-mono text-xs font-black text-foreground">
            {selectedService.status === "DOWN"
              ? `${formatServiceLatencyLabel(selectedService)}`
              : `${selectedService.latencyMs}ms`}
          </span>
        </div>

        <div className={`rounded-xl bg-background p-2.5 ${NM.extruded}`}>
          <span className="block text-[10px] font-semibold text-muted-foreground">
            {t("system.health.tableUptime")}
          </span>
          <span className="mt-0.5 block font-mono text-xs font-black text-foreground">
            {selectedService.uptime || "--"}
          </span>
        </div>

        <div className={`rounded-xl bg-background p-2.5 ${NM.extruded}`}>
          <span className="block text-[10px] font-semibold text-muted-foreground">
            {t("dashboard.systemCard.thresholdNote")}
          </span>
          <span className="mt-0.5 block truncate text-xs font-black text-primary">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Khối chẩn đoán & các bước xử lý (Không viền, nổi nhẹ) */}
      <div className={`space-y-2.5 rounded-2xl bg-background p-3 ${NM.extruded}`}>
        <p className="text-[11px] leading-relaxed text-foreground">
          <strong className="font-extrabold">
            {t("dashboard.systemCard.whyTitle")}:
          </strong>{" "}
          {selectedGuidance.why}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong className="font-bold text-foreground">
            {t("dashboard.systemCard.impactTitle")}:
          </strong>{" "}
          {selectedGuidance.impact}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong className="font-bold text-primary">
            {t("dashboard.systemCard.stillWorksTitle")}:
          </strong>{" "}
          {selectedGuidance.stillWorks}
        </p>

        {/* Các bước khắc phục nằm trong khay lõm mini */}
        <div className={`rounded-xl bg-background p-2.5 ${NM.recessed}`}>
          <p className="mb-1.5 text-[11px] font-extrabold text-foreground">
            {isAdmin
              ? t("dashboard.systemCard.adminStepsTitle")
              : t("dashboard.systemCard.nextStepsTitle")}
          </p>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {selectedGuidance.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Nút hành động trong ngăn kéo */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {canCopyReport && (
            <button
              type="button"
              onClick={onCopyReport}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-foreground transition-all ${NM.tactileBtn}`}
            >
              {copiedReport ? (
                <Check className="size-3 text-primary" />
              ) : (
                <Copy className="size-3 text-muted-foreground" />
              )}
              <span>
                {copiedReport
                  ? t("dashboard.systemCard.copiedReport")
                  : t("dashboard.systemCard.copyReport")}
              </span>
            </button>
          )}

          {isAdmin && selectedGuidance.actionHref && (
            <Link
              href={selectedGuidance.actionHref}
              className={`inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-primary transition-all ${NM.tactileBtn}`}
            >
              <span>{selectedGuidance.actionLabel}</span>
              <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
