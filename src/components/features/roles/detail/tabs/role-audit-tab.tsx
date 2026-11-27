"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, ScrollText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-action";
import {
  AuditLogTable,
  AuditDetailDrawer,
} from "@/components/features/audit-logs";
import { useAuditLogs } from "@/hooks/audit";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import type { AuditLogDetail, AuditLogItem, RoleDto } from "@/types";
import { auditService } from "@/services";

export interface RoleAuditTabProps {
  role: RoleDto;
}

export function RoleAuditTab({ role }: RoleAuditTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canReadAuditLogs = can("AUDIT_LOG_READ");

  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<AuditLogItem | null>(null);
  const [detailData, setDetailData] = useState<AuditLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch audit logs matching this role
  const {
    data: auditResult,
    isLoading,
    isRefetching,
    refetch,
  } = useAuditLogs(
    {
      targetType: "ROLE",
      targetId: role.id,
      page,
      limit: 20,
      sortBy: "createdAt",
      order: "desc",
    },
    {
      enabled: canReadAuditLogs,
    },
  );

  const logs = auditResult?.items || [];
  const meta = auditResult?.meta || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  };

  const handleSelectRecord = async (record: AuditLogItem) => {
    setSelectedRecord(record);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const detail = await auditService.getLogDetail(record.id);
      setDetailData(detail);
    } catch {
      // Fallback to record if detail fetch fails
      const d = (record.details || {}) as Record<string, unknown>;
      setDetailData({
        ...record,
        oldValue: (d.oldValue as Record<string, unknown>) ?? (d.previous as Record<string, unknown>) ?? null,
        newValue: (d.newValue as Record<string, unknown>) ?? (d.updated as Record<string, unknown>) ?? (d.current as Record<string, unknown>) ?? null,
        metadata: Object.keys(d).length > 0 ? d : null,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── HEADER TOOLBAR ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/80 bg-surface p-3.5 sm:p-4 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ScrollText className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">
              {isVietnamese
                ? `Nhật ký kiểm toán vai trò ${role.name}`
                : `Audit trail for ${role.name}`}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isVietnamese
                ? "Ghi nhận mọi thao tác tạo vai trò, đổi tên, cập nhật hoặc gỡ quyền hạn"
                : "Tracking all lifecycle events: creation, edits, and permission synchronization"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton
            variant="ghost"
            size="sm"
            onRefresh={() => refetch()}
            isRefreshing={isRefetching}
            className="h-8 text-xs"
          />

          <Link href={`/audit-logs?search=${encodeURIComponent(role.name)}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
            >
              <span>{isVietnamese ? "Mở toàn bộ Audit Logs" : "All Audit Logs"}</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── AUDIT LOGS TABLE ──────────────────────────────────────────── */}
      {logs.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-surface p-12 text-center space-y-2">
          <Shield className="h-10 w-10 text-muted-foreground/40 mb-1" />
          <h4 className="text-sm font-bold text-foreground">
            {isVietnamese
              ? "Chưa có sự kiện kiểm toán riêng cho vai trò này"
              : "No specific audit events recorded for this role yet"}
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            {isVietnamese
              ? "Mọi thay đổi phân quyền sắp tới sẽ được lưu vết tự động kèm địa chỉ IP và danh tính người thực hiện."
              : "Future permission updates will be permanently recorded here with actor identity and IP address."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/80 bg-surface p-2 sm:p-4 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)]">
          <AuditLogTable
            items={logs}
            onSelectRecord={handleSelectRecord}
            loading={isLoading}
            pagination={{
              page,
              limit: meta.limit,
              total: meta.total,
              totalPages: meta.totalPages,
              onPageChange: setPage,
            }}
          />
        </div>
      )}

      {/* ── AUDIT DETAIL & DIFF DRAWER ────────────────────────────────── */}
      <AuditDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        detail={detailData}
        loading={detailLoading}
      />
    </div>
  );
}
