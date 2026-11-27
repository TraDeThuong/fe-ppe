"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KeyRound, ShieldAlert, Terminal, Webhook } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  ApiKeysTab,
  IntegrationKpiSummary,
  JobTriggerPlayground,
  WebhooksTab,
} from "@/components/features/integrations";
import { RefreshButton } from "@/components/ui/refresh-action";
import { usePublicConfig } from "@/hooks/auth";
import { useApiKeys, useIntegrationMutations, useWebhooks } from "@/hooks/integration";
import { useFeatureFlags } from "@/hooks/system/use-feature-flags";
import { useCan } from "@/hooks/use-can";
import {
  getConfig,
  isFeatureFlagEnabled,
  SYSTEM_CONFIG_KEYS,
} from "@/lib/system-config";
import { useLocale } from "@/providers/locale-provider";

export type IntegrationTab = "api-keys" | "webhooks" | "playground";

export default function IntegrationsContent() {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const can = useCan();

  const canReadApiKeys = can("API_KEY_READ");
  const canManageApiKeys = can("API_KEY_MANAGE");
  const canReadWebhooks = can("WEBHOOK_READ");
  const canManageWebhooks = can("WEBHOOK_MANAGE");
  const canReadSystemConfig = can("SYSTEM_CONFIG_READ");

  const hasApiKeysTab = canReadApiKeys || canManageApiKeys;
  const hasWebhooksTab = canReadWebhooks || canManageWebhooks;
  const canAccessPlayground = hasApiKeysTab || hasWebhooksTab;

  const allowedTabs = useMemo<IntegrationTab[]>(() => {
    const tabs: IntegrationTab[] = [];
    if (hasApiKeysTab) tabs.push("api-keys");
    if (hasWebhooksTab) tabs.push("webhooks");
    if (canAccessPlayground) tabs.push("playground");
    return tabs;
  }, [hasApiKeysTab, hasWebhooksTab, canAccessPlayground]);

  const defaultTab: IntegrationTab = allowedTabs[0] ?? "api-keys";
  const tabParam = searchParams.get("tab") as IntegrationTab | null;
  const activeTab: IntegrationTab =
    tabParam && allowedTabs.includes(tabParam) ? tabParam : defaultTab;

  // Đồng bộ lại query ?tab= trên URL nếu tabParam không hợp lệ hoặc vượt quyền của user
  useEffect(() => {
    if (!tabParam || allowedTabs.length === 0) return;
    if (!allowedTabs.includes(tabParam)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", defaultTab);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }, [tabParam, allowedTabs, defaultTab, searchParams, pathname, router]);

  const handleTabChange = (nextTab: IntegrationTab) => {
    if (!allowedTabs.includes(nextTab)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const apiKeysQuery = useApiKeys(canReadApiKeys);
  const webhooksQuery = useWebhooks(canReadWebhooks);
  const { data: publicConfig } = usePublicConfig();
  const { data: featureFlags = [] } = useFeatureFlags({
    enabled: canReadSystemConfig,
  });
  const mutations = useIntegrationMutations();

  const webhooksEnabled = useMemo(() => {
    const flagItem = featureFlags.find(
      (item) => item.key === SYSTEM_CONFIG_KEYS.webhooksEnabled,
    );
    if (flagItem !== undefined) {
      return isFeatureFlagEnabled(flagItem.value);
    }
    const publicVal = getConfig(
      publicConfig,
      SYSTEM_CONFIG_KEYS.webhooksEnabled,
      undefined,
    );
    if (publicVal !== undefined) {
      return isFeatureFlagEnabled(publicVal);
    }
    return true;
  }, [featureFlags, publicConfig]);

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
          <RefreshButton
            variant="ghost"
            size="md"
            isRefreshing={isRefreshing}
            onRefresh={() =>
              Promise.all([
                canReadApiKeys ? apiKeysQuery.refetch() : Promise.resolve(),
                canReadWebhooks ? webhooksQuery.refetch() : Promise.resolve(),
              ])
            }
            iconClassName="h-4 w-4"
            className="gap-2"
          />
        }
      />

      {(canReadApiKeys || canReadWebhooks) && (
        <IntegrationKpiSummary
          apiKeys={apiKeys}
          webhooks={webhooks}
          canReadApiKeys={canReadApiKeys}
          canReadWebhooks={canReadWebhooks}
          loading={
            (canReadApiKeys && apiKeysQuery.isLoading) ||
            (canReadWebhooks && webhooksQuery.isLoading)
          }
        />
      )}

      {allowedTabs.length === 0 ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl bg-surface p-10 text-center shadow-nm-inset"
        >
          <ShieldAlert className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">
            {isVi
              ? "Bạn không có quyền truy cập cấu hình tích hợp"
              : "You do not have permission to access integrations"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isVi
              ? "Vui lòng liên hệ quản trị viên để được cấp quyền API_KEY_READ hoặc WEBHOOK_READ."
              : "Please contact an administrator to request API_KEY_READ or WEBHOOK_READ permissions."}
          </p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 rounded-2xl bg-surface p-2 shadow-nm-inset">
            {hasApiKeysTab && (
              <button
                type="button"
                onClick={() => handleTabChange("api-keys")}
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

            {hasWebhooksTab && (
              <button
                type="button"
                onClick={() => handleTabChange("webhooks")}
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

            {canAccessPlayground && (
              <button
                type="button"
                onClick={() => handleTabChange("playground")}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "playground"
                    ? "bg-background text-primary shadow-nm-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>
                  {isVi ? "Kiểm thử Trigger Job" : "Job Trigger Playground"}
                </span>
              </button>
            )}
          </div>

          {activeTab === "api-keys" && hasApiKeysTab && (
            <ApiKeysTab
              apiKeys={apiKeys}
              loading={canReadApiKeys && apiKeysQuery.isLoading}
              mutating={isMutating}
              onCreate={(payload) => mutations.createApiKey.mutateAsync(payload)}
              onToggle={async (id, isActive) => {
                await mutations.toggleApiKey.mutateAsync({
                  id,
                  payload: { isActive },
                });
              }}
              onDelete={async (id) => {
                await mutations.deleteApiKey.mutateAsync(id);
              }}
            />
          )}

          {activeTab === "webhooks" && hasWebhooksTab && (
            <WebhooksTab
              webhooks={webhooks}
              loading={canReadWebhooks && webhooksQuery.isLoading}
              webhooksEnabled={webhooksEnabled}
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
                await mutations.retryDelivery.mutateAsync({
                  deliveryId,
                  webhookId,
                });
              }}
            />
          )}

          {activeTab === "playground" && canAccessPlayground && (
            <JobTriggerPlayground
              loading={mutations.triggerDemoJob.isPending}
              onTrigger={(apiKey, payload) =>
                mutations.triggerDemoJob.mutateAsync({ apiKey, payload })
              }
            />
          )}
        </>
      )}
    </div>
  );
}

