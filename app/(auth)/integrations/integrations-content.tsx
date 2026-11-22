"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw, Terminal, Webhook } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  ApiKeysTab,
  IntegrationKpiSummary,
  JobTriggerPlayground,
  WebhooksTab,
} from "@/components/features/integrations";
import { Button } from "@/components/ui/button";
import { useApiKeys, useIntegrationMutations, useWebhooks } from "@/hooks/integration";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";

type IntegrationTab = "api-keys" | "webhooks" | "playground";

export default function IntegrationsContent() {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const can = useCan();

  const canReadApiKeys = can("API_KEY_READ");
  const canReadWebhooks = can("WEBHOOK_READ");

  const defaultTab: IntegrationTab = canReadApiKeys ? "api-keys" : "webhooks";
  const [activeTab, setActiveTab] = useState<IntegrationTab>(defaultTab);

  // Đồng bộ lại tab hợp lệ sau khi AuthContext hydrate permissions
  useEffect(() => {
    if (activeTab === "api-keys" && !canReadApiKeys && canReadWebhooks) {
      setActiveTab("webhooks");
    } else if (activeTab === "webhooks" && !canReadWebhooks && canReadApiKeys) {
      setActiveTab("api-keys");
    }
  }, [activeTab, canReadApiKeys, canReadWebhooks]);

  const apiKeysQuery = useApiKeys(canReadApiKeys);
  const webhooksQuery = useWebhooks(canReadWebhooks);
  const mutations = useIntegrationMutations();

  const apiKeys = apiKeysQuery.data ?? [];
  const webhooks = webhooksQuery.data ?? [];

  const breadcrumbs = useMemo(
    () => [
      { label: t("common.breadcrumb.home"), href: "/dashboard" },
      { label: t("nav.integrations") },
    ],
    [t],
  );

  const isMutating =
    mutations.createApiKey.isPending ||
    mutations.toggleApiKey.isPending ||
    mutations.deleteApiKey.isPending ||
    mutations.createWebhook.isPending ||
    mutations.updateWebhook.isPending ||
    mutations.deleteWebhook.isPending ||
    mutations.testPingWebhook.isPending ||
    mutations.retryDelivery.isPending ||
    mutations.triggerDemoJob.isPending;

  const isRefreshing = apiKeysQuery.isFetching || webhooksQuery.isFetching;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        icon={Webhook}
        title={isVi ? "Tích hợp API Keys & Webhooks" : "API Keys & Webhooks Integration"}
        description={
          isVi
            ? "Cấp phát khóa API có phạm vi quyền hạn, đăng ký Webhook nhận sự kiện thời gian thực và theo dõi nhật ký gửi."
            : "Issue scoped API keys, configure HMAC-signed webhooks, inspect delivery logs and test callback triggers."
        }
        badge={isVi ? "Developer Gateway" : "Developer Gateway"}
        breadcrumbs={breadcrumbs}
        actions={
          <Button
            variant="ghost"
            size="md"
            disabled={isRefreshing}
            onClick={() => {
              if (canReadApiKeys) void apiKeysQuery.refetch();
              if (canReadWebhooks) void webhooksQuery.refetch();
            }}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{t("common.refresh")}</span>
          </Button>
        }
      />

      <IntegrationKpiSummary
        apiKeys={apiKeys}
        webhooks={webhooks}
        loading={apiKeysQuery.isLoading || webhooksQuery.isLoading}
      />

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-surface p-2 shadow-nm-inset">
        {canReadApiKeys && (
          <button
            type="button"
            onClick={() => setActiveTab("api-keys")}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "api-keys"
                ? "bg-background text-primary shadow-nm-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>API Keys ({apiKeys.length})</span>
          </button>
        )}

        {canReadWebhooks && (
          <button
            type="button"
            onClick={() => setActiveTab("webhooks")}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "webhooks"
                ? "bg-background text-primary shadow-nm-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Webhook className="h-3.5 w-3.5" />
            <span>Webhooks ({webhooks.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("playground")}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "playground"
              ? "bg-background text-primary shadow-nm-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>{isVi ? "Kiểm thử Trigger Job" : "Job Trigger Playground"}</span>
        </button>
      </div>

      {activeTab === "api-keys" && canReadApiKeys && (
        <ApiKeysTab
          apiKeys={apiKeys}
          loading={apiKeysQuery.isLoading}
          mutating={isMutating}
          onCreate={(payload) => mutations.createApiKey.mutateAsync(payload)}
          onToggle={async (id, isActive) => {
            await mutations.toggleApiKey.mutateAsync({ id, payload: { isActive } });
          }}
          onDelete={async (id) => {
            await mutations.deleteApiKey.mutateAsync(id);
          }}
        />
      )}

      {activeTab === "webhooks" && canReadWebhooks && (
        <WebhooksTab
          webhooks={webhooks}
          loading={webhooksQuery.isLoading}
          mutating={isMutating}
          onCreate={(payload) => mutations.createWebhook.mutateAsync(payload)}
          onUpdate={async (id, payload) => {
            await mutations.updateWebhook.mutateAsync({ id, payload });
          }}
          onDelete={async (id) => {
            await mutations.deleteWebhook.mutateAsync(id);
          }}
          onTestPing={(id) => mutations.testPingWebhook.mutateAsync(id)}
          onRetryDelivery={async (deliveryId, webhookId) => {
            await mutations.retryDelivery.mutateAsync({ deliveryId, webhookId });
          }}
        />
      )}

      {activeTab === "playground" && (
        <JobTriggerPlayground
          loading={mutations.triggerDemoJob.isPending}
          onTrigger={(apiKey, payload) =>
            mutations.triggerDemoJob.mutateAsync({ apiKey, payload })
          }
        />
      )}
    </div>
  );
}

