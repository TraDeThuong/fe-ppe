"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Send, Mail } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { usePublicConfig } from "@/hooks/auth";
import { useTestSendNotificationTemplate } from "@/hooks/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/axios";
import {
  getConfig,
  isFeatureFlagEnabled,
  SYSTEM_CONFIG_KEYS,
} from "@/lib/system-config";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode, type NotificationTemplateItemDto } from "@/types";

export interface TestSendTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: NotificationTemplateItemDto | null;
}

const DEFAULT_SAMPLE_VARIABLES: Record<string, unknown> = {
  workerName: "Nguyễn Văn An",
  workerId: "NV-8921",
  siteName: "Công trường Landmark Tòa B",
  violationType: "Thiếu nón bảo hộ (No Hardhat)",
  timestamp: "14:32 28/10/2026",
  severity: "HIGH",
};

export function TestSendTemplateModal({
  open,
  onOpenChange,
  template,
}: TestSendTemplateModalProps) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { data: publicConfig } = usePublicConfig();
  const notificationsEnabled = isFeatureFlagEnabled(
    getConfig(publicConfig, SYSTEM_CONFIG_KEYS.notificationsEnabled, true),
  );

  const [toEmail, setToEmail] = useState("");
  const [variablesText, setVariablesText] = useState(
    JSON.stringify(DEFAULT_SAMPLE_VARIABLES, null, 2),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setToEmail(user?.email || "");
      setVariablesText(JSON.stringify(DEFAULT_SAMPLE_VARIABLES, null, 2));
      setSubmitError(null);
    }
  }, [open, user]);

  const testSendMutation = useTestSendNotificationTemplate({
    onSuccess: () => {
      setSubmitError(null);
      onOpenChange(false);
    },
  });

  if (!template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !notificationsEnabled) return;
    setSubmitError(null);

    let parsedVars: Record<string, unknown> = {};
    try {
      parsedVars = JSON.parse(variablesText);
    } catch {
      // JSON parse error
    }

    try {
      await testSendMutation.mutateAsync({
        code: template.code,
        payload: {
          toEmail:
            template.channel === "ZALO_BOT" ? undefined : toEmail.trim() || undefined,
          variables: parsedVars,
        },
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === ErrorCode.FEATURE_DISABLED
      ) {
        setSubmitError(
          isVietnamese
            ? "Hệ thống gửi thông báo và email tự động đang bị Quản trị viên tạm dừng. Không thể gửi thử mẫu lúc này."
            : "Automated notifications and email dispatch are currently paused by the Administrator. Cannot send test template right now.",
        );
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      }
    }
  };

  const inputSocketClass = [
    "w-full rounded-xl px-3.5 py-2.5",
    "border border-[var(--shadow-dark)]/30 dark:border-white/10 bg-background",
    "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
    "focus-within:ring-2 focus-within:ring-primary/40 outline-none transition-all text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60",
  ].join(" ");

  return (
    <SculptedModal
      open={open}
      onOpenChange={onOpenChange}
      title={isVietnamese ? `Gửi thử nghiệm mẫu: ${template.name}` : `Test Send: ${template.name}`}
      description={
        isVietnamese
          ? `Gửi bản thử nghiệm với dữ liệu giả lập để kiểm tra văn phong và định dạng email`
          : `Send a test notification with simulated data to verify formatting`
      }
      icon={<Send className="h-5 w-5 text-primary" />}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={testSendMutation.isPending}
          >
            {isVietnamese ? "Hủy bỏ" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="test-send-template-form"
            variant="primary"
            disabled={testSendMutation.isPending || !notificationsEnabled}
            title={
              !notificationsEnabled
                ? isVietnamese
                  ? "Hệ thống gửi thông báo đang tạm tắt trong Cấu hình hệ thống"
                  : "Notification dispatch is currently disabled in System Settings"
                : undefined
            }
          >
            <Send className="mr-1.5 size-3.5" />
            {testSendMutation.isPending
              ? isVietnamese
                ? "Đang gửi..."
                : "Sending..."
              : isVietnamese
              ? "Gửi thử nghiệm ngay"
              : "Send Test"}
          </Button>
        </>
      }
    >
      <form
        id="test-send-template-form"
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {!notificationsEnabled && (
          <div
            role="alert"
            data-testid="test-send-disabled-alert"
            className="flex items-start gap-2.5 rounded-xl border border-warning/35 bg-warning/15 p-3 text-xs text-foreground"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="font-bold">
                {isVietnamese
                  ? "Hệ thống gửi thông báo và email tự động đang bị Quản trị viên tạm dừng."
                  : "Automated notifications and email dispatch are currently paused by the Administrator."}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Thao tác gửi thử mẫu tạm thời bị vô hiệu hóa cho đến khi Quản trị viên bật lại tính năng này."
                  : "Test send is temporarily disabled until the Administrator re-enables this feature."}
              </p>
            </div>
          </div>
        )}

        {submitError && (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
          >
            {submitError}
          </p>
        )}

        {/* Template Zalo Bot: tin thử gửi tới hội thoại Zalo đã liên kết của chính người thao tác */}
        {template?.channel === "ZALO_BOT" ? (
          <p
            role="note"
            data-testid="test-send-zalo-note"
            className="rounded-xl border border-info/25 bg-info/[0.06] p-3 text-xs leading-relaxed text-muted-foreground"
          >
            {isVietnamese
              ? "Mẫu kênh Zalo Bot: tin thử sẽ được gửi tới hội thoại Zalo bạn đã liên kết (Cài đặt thông báo → Zalo Bot). Nếu chưa liên kết, hệ thống sẽ từ chối gửi."
              : "Zalo Bot template: the test message is sent to your linked Zalo conversation (Notification settings → Zalo Bot). If you have not linked one, the request is rejected."}
          </p>
        ) : (
        /* Email nhận thử nghiệm */
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Địa chỉ Email nhận thử nghiệm" : "Test Recipient Email"}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="admin@smartsite.vn"
              className={`${inputSocketClass} pl-9`}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {isVietnamese
              ? "Hệ thống sẽ chuyển phát email này thông qua dịch vụ Mailer trực tiếp."
              : "System will dispatch this test email via configured mail transport."}
          </p>
        </div>
        )}

        {/* Biến thử nghiệm JSON */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Các biến nội suy thử nghiệm (JSON)" : "Test Variables (JSON)"}
          </label>
          <textarea
            rows={6}
            value={variablesText}
            onChange={(e) => setVariablesText(e.target.value)}
            className="w-full rounded-xl border border-border/40 bg-background p-3 font-mono text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/50"
          />
        </div>
      </form>
    </SculptedModal>
  );
}
