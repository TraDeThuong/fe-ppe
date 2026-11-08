"use client";

import Link from "next/link";
import { Clock, ExternalLink, Globe, Shield, User } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { AuditLogDetail } from "@/types";
import { AuditActionBadge } from "../audit-action-badge";
import { AuditDiffViewer } from "../audit-diff-viewer";

export interface AuditDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: AuditLogDetail | null;
  loading?: boolean;
}

export function AuditDetailDrawer({
  open,
  onOpenChange,
  detail,
  loading = false,
}: AuditDetailDrawerProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const getRelatedResourceHref = () => {
    if (!detail?.targetType || !detail?.targetId || detail.targetId === "SYSTEM") return null;
    if (detail.targetType === "PPE_INCIDENT" || detail.targetType === "INCIDENT") {
      return `/incidents/${detail.targetId}`;
    }
    if (detail.targetType === "CAMERA") {
      return `/cameras/${detail.targetId}`;
    }
    if (detail.targetType === "SITE") {
      return `/sites/${detail.targetId}`;
    }
    if (detail.targetType === "USER") {
      return `/users`;
    }
    if (detail.targetType === "ROLE") {
      return `/roles/${detail.targetId}`;
    }
    return null;
  };

  const relatedResourceHref = getRelatedResourceHref();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("audit.drawer.title")}
      description={detail?.id ? `ID: #${detail.id}` : undefined}
      icon={<Shield className="h-5 w-5 text-primary" />}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {relatedResourceHref && (
            <Link
              href={relatedResourceHref}
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/20 shadow-[2px_2px_4px_var(--shadow-dark)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Xem tài nguyên liên quan" : "View Related Resource"}</span>
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto ml-auto"
          >
            {t("common.close")}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-4 py-8">
          <div className="h-10 animate-pulse rounded-xl bg-surface-elevated/40" />
          <div className="h-40 animate-pulse rounded-xl bg-surface-elevated/40" />
        </div>
      ) : detail ? (
        <div className="space-y-5">
          {/* Action Details Header */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/40 bg-surface p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {t("audit.table.actor")}
              </span>
              <p className="text-sm font-semibold text-foreground">
                {detail.userEmail || detail.actor?.email || "Hệ thống"}{" "}
                {detail.userRole || detail.actor?.roleName
                  ? `(${detail.userRole || detail.actor?.roleName})`
                  : ""}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {t("audit.table.timestamp")}
              </span>
              <p className="font-mono text-xs text-foreground">
                {new Date(detail.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("audit.table.action")}</span>
              <div>
                <AuditActionBadge action={detail.action} />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                {t("audit.drawer.deviceDetails")}
              </span>
              <p className="font-mono text-xs text-foreground truncate">
                {detail.ipAddress || "127.0.0.1"} • {detail.userAgent || "Unknown UA"}
              </p>
            </div>
          </div>

          {/* JSON Diff Viewer */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">
              {t("audit.drawer.diffTitle")}
            </h4>
            <AuditDiffViewer oldValue={detail.oldValue} newValue={detail.newValue} />
          </div>

          {/* Supplementary Metadata */}
          {detail.metadata && Object.keys(detail.metadata).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">
                {t("audit.drawer.metadata")}
              </h4>
              <pre className="rounded-xl border border-border/40 bg-surface-elevated/30 p-3 font-mono text-xs text-foreground/80 overflow-x-auto">
                {JSON.stringify(detail.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
