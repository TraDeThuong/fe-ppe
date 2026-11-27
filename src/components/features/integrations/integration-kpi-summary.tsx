"use client";

import { KeyRound, ShieldCheck, Webhook, Zap } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { ApiKeyItemDto, WebhookEndpointDto } from "@/types";

export interface IntegrationKpiSummaryProps {
  apiKeys: ApiKeyItemDto[];
  webhooks: WebhookEndpointDto[];
  loading?: boolean;
  canReadApiKeys?: boolean;
  canReadWebhooks?: boolean;
}

export function IntegrationKpiSummary({
  apiKeys,
  webhooks,
  loading = false,
  canReadApiKeys = true,
  canReadWebhooks = true,
}: IntegrationKpiSummaryProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  if (!canReadApiKeys && !canReadWebhooks) {
    return null;
  }

  const nowMs = Date.now();
  const activeKeys = apiKeys.filter(
    (k) => k.isActive && (!k.expiresAt || new Date(k.expiresAt).getTime() > nowMs),
  ).length;
  const activeWebhooks = webhooks.filter((w) => w.isActive).length;
  const recentUsedKeys = apiKeys.filter((k) => Boolean(k.lastUsedAt)).length;
  const gridCols =
    canReadApiKeys && canReadWebhooks
      ? "grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      : "grid-cols-1 gap-4 sm:grid-cols-2";

  return (
    <div className={`grid ${gridCols}`}>
      {canReadApiKeys && (
        <>
          <StatsCard
            title={isVi ? "API Keys Hoạt động" : "Active API Keys"}
            value={activeKeys}
            description={
              isVi
                ? `Trên tổng số ${apiKeys.length} khóa đã cấp`
                : `Of ${apiKeys.length} total keys`
            }
            icon={KeyRound}
            tone="primary"
            loading={loading}
          />
          <StatsCard
            title={isVi ? "Khóa Đã Sử dụng" : "Keys With Traffic"}
            value={recentUsedKeys}
            description={
              isVi
                ? "Khóa đã từng gọi xác thực X-API-Key"
                : "Keys used via X-API-Key auth"
            }
            icon={ShieldCheck}
            tone="info"
            loading={loading}
          />
        </>
      )}
      {canReadWebhooks && (
        <>
          <StatsCard
            title={isVi ? "Webhook Đang bật" : "Active Webhooks"}
            value={activeWebhooks}
            description={
              isVi
                ? `Trên tổng số ${webhooks.length} endpoint`
                : `Of ${webhooks.length} total endpoints`
            }
            icon={Webhook}
            tone="success"
            loading={loading}
          />
          <StatsCard
            title={isVi ? "Kênh Sự kiện Đăng ký" : "Subscribed Event Rules"}
            value={webhooks.reduce((acc, w) => acc + (w.events?.length || 0), 0)}
            description={
              isVi
                ? "Tổng số bộ lọc sự kiện trên các webhook"
                : "Total event filters across endpoints"
            }
            icon={Zap}
            tone="warning"
            loading={loading}
          />
        </>
      )}
    </div>
  );
}

