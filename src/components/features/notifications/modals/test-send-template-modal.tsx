"use client";

import { useState, useEffect } from "react";
import { Send, Mail, CheckCircle, RefreshCw } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useTestSendNotificationTemplate } from "@/hooks/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationTemplateItemDto } from "@/types";

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

  const [toEmail, setToEmail] = useState("");
  const [variablesText, setVariablesText] = useState(
    JSON.stringify(DEFAULT_SAMPLE_VARIABLES, null, 2),
  );

  useEffect(() => {
    if (open) {
      setToEmail(user?.email || "");
      setVariablesText(JSON.stringify(DEFAULT_SAMPLE_VARIABLES, null, 2));
    }
  }, [open, user]);

  const testSendMutation = useTestSendNotificationTemplate({
    onSuccess: () => {
      onOpenChange(false);
    },
  });

  if (!template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    let parsedVars: Record<string, unknown> = {};
    try {
      parsedVars = JSON.parse(variablesText);
    } catch {
      // JSON parse error
    }

    await testSendMutation.mutateAsync({
      code: template.code,
      payload: {
        toEmail: toEmail.trim() || undefined,
        variables: parsedVars,
      },
    });
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
            disabled={testSendMutation.isPending}
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
        {/* Email nhận thử nghiệm */}
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
