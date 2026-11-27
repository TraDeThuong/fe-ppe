"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Shield,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { hasRouteAccess } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { AuditLogDetail } from "@/types";
import { AuditActionBadge } from "../audit-action-badge";
import { getAuditActionInfo } from "../audit-action-dictionary";
import { AuditDiffViewer } from "../audit-diff-viewer";
import { diagnoseAuditFailure } from "../audit-error-diagnosis";

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
  const { user } = useAuth();
  const isVietnamese = locale === "vi-VN";
  const [copied, setCopied] = useState(false);
  const canOpenRoute = (href: string) => hasRouteAccess(href, user?.permissions, user?.role);

  const getRelatedResourceHref = () => {
    if (!detail?.targetType || !detail?.targetId || detail.targetId === "SYSTEM") return null;
    if (detail.targetType === "USER") {
      return `/users/${detail.targetId}`;
    }
    if (detail.targetType === "ROLE") {
      return `/roles/${detail.targetId}`;
    }
    return null;
  };

  const relatedResourceHref = getRelatedResourceHref();

  const handleCopyJson = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(detail, null, 2));
      setCopied(true);
      toast.success(t("audit.drawer.copiedJson"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(isVietnamese ? "Không thể sao chép vào clipboard." : "Failed to copy to clipboard.");
    }
  };

  const actorPrimary =
    detail?.userName ||
    detail?.actor?.fullName ||
    detail?.userEmail ||
    detail?.actor?.email ||
    (isVietnamese ? "Hệ thống tự động" : "Automated System");
  const actorEmail = detail?.userEmail || detail?.actor?.email;
  const actorRole = detail?.userRole || detail?.actor?.roleName;
  const isFailed = detail?.status === "FAILED";
  const failureDiagnosis = detail && (isFailed || detail.errorMessage) ? diagnoseAuditFailure(detail, locale) : null;
  const actionLink = failureDiagnosis?.actionLink;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("audit.drawer.title")}
      description={detail?.id ? `ID: #${detail.id}` : undefined}
      icon={<Shield className="h-5 w-5 text-primary" />}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {relatedResourceHref && canOpenRoute(relatedResourceHref) && (
              <Link
                href={relatedResourceHref}
                onClick={() => onOpenChange(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/20 shadow-[2px_2px_4px_var(--shadow-dark)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Xem tài nguyên liên quan" : "View Related Resource"}</span>
              </Link>
            )}

            {detail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="gap-1.5 text-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{t("audit.drawer.copyJson")}</span>
              </Button>
            )}
          </div>

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
          {/* Failure Diagnosis & Remediation Banner if FAILED */}
          {failureDiagnosis && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-3.5 text-xs space-y-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-danger">{failureDiagnosis.title}</p>
                    <p className="text-foreground leading-relaxed">{failureDiagnosis.explanation}</p>
                  </div>
                </div>

                {actionLink && canOpenRoute(actionLink.href) && (
                  <Link
                    href={actionLink.href}
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/15 shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>{actionLink.label}</span>
                  </Link>
                )}
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{failureDiagnosis.impactNote}</span>
              </p>

              <div className="space-y-1 border-t border-danger/20 pt-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                  <Wrench className="h-3 w-3 text-primary" />
                  {t("audit.detail.howToFix")}:
                </span>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-muted-foreground">
                  {failureDiagnosis.steps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Action Details Header */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/40 bg-surface p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {t("audit.table.actor")}
              </span>
              <p className="text-sm font-semibold text-foreground">
                {actorPrimary}
                {actorRole ? ` (${actorRole})` : ""}
              </p>
              {actorEmail && actorEmail !== actorPrimary && (
                <p className="text-xs text-muted-foreground">{actorEmail}</p>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {t("audit.table.timestamp")}
              </span>
              <p className="font-mono text-xs text-foreground">
                {new Date(detail.createdAt).toLocaleString(locale)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("audit.table.action")}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <AuditActionBadge action={detail.action} showCode />
                {isFailed ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                    <XCircle className="h-3 w-3" /> FAILED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <CheckCircle2 className="h-3 w-3" /> SUCCESS
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {getAuditActionInfo(detail.action, locale).description}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                {t("audit.drawer.deviceDetails")}
              </span>
              <p className="font-mono text-xs text-foreground break-all">
                {detail.ipAddress || "—"} • {detail.userAgent || "—"}
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
