"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-action";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useWebhookDeliveries } from "@/hooks/integration";
import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { WebhookDeliveryStatus, WebhookEndpointDto } from "@/types";

export interface WebhookDeliveriesDrawerProps {
  webhook: WebhookEndpointDto | null;
  onClose: () => void;
  onRetry: (deliveryId: string, webhookId: string) => Promise<void>;
  retrying?: boolean;
}

export function WebhookDeliveriesDrawer({
  webhook,
  onClose,
  onRetry,
  retrying = false,
}: WebhookDeliveriesDrawerProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const canManage = useCan()("WEBHOOK_MANAGE");

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<WebhookDeliveryStatus | "">("");
  const [eventFilter, setEventFilter] = useState("");
  const debouncedEventFilter = useDebounce(eventFilter, 300);

  // Reset pagination & bộ lọc khi mở sang webhook khác
  useEffect(() => {
    setPage(1);
    setStatus("");
    setEventFilter("");
  }, [webhook?.id]);

  const { data, isLoading, refetch, isFetching } = useWebhookDeliveries(
    webhook?.id ?? null,
    { page, limit: 15, status, event: debouncedEventFilter },
    Boolean(webhook),
  );

  const deliveries = data?.items ?? [];
  const meta = data?.meta;

  const statusOptions: SelectOption[] = [
    { value: "", label: isVi ? "Tất cả trạng thái" : "All statuses" },
    { value: "SUCCESS", label: "SUCCESS" },
    { value: "FAILED", label: "FAILED" },
    { value: "PENDING", label: "PENDING" },
    { value: "PROCESSING", label: "PROCESSING" },
  ];

  const handleRetry = async (deliveryId: string) => {
    if (!webhook) return;
    try {
      await onRetry(deliveryId, webhook.id);
      toast.success(
        isVi ? "Đã đưa delivery vào hàng đợi gửi lại" : "Delivery queued for retry",
      );
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry delivery");
    }
  };

  const getStatusVariant = (st: string) => {
    if (st === "SUCCESS") return "success";
    if (st === "FAILED") return "danger";
    if (st === "PROCESSING") return "info";
    return "warning";
  };

  return (
    <Dialog
      open={Boolean(webhook)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isVi ? "Lịch sử Gửi Webhook (Deliveries)" : "Webhook Delivery Logs"}
      description={webhook?.url || ""}
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-44">
            <Select
              size="sm"
              options={statusOptions}
              value={status}
              onValueChange={(val) => {
                setStatus(val as WebhookDeliveryStatus | "");
                setPage(1);
              }}
            />
          </div>
          <Input
            size="sm"
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setPage(1);
            }}
            placeholder={isVi ? "Lọc theo tên sự kiện..." : "Filter by event name..."}
            className="w-full sm:max-w-xs"
          />
          <RefreshButton
            size="sm"
            variant="outline"
            onRefresh={() => refetch()}
            isRefreshing={isFetching}
          />
        </div>

        {isLoading ? (
          <div className="h-44 animate-pulse rounded-2xl bg-surface-elevated/40" />
        ) : deliveries.length === 0 ? (
          <div className="rounded-2xl p-8 text-center text-xs text-muted-foreground shadow-nm-inset">
            {isVi ? "Chưa có lượt gửi webhook nào." : "No deliveries recorded yet."}
          </div>
        ) : (
          <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
            {deliveries.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl border border-border/30 bg-surface p-3.5 text-xs space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusVariant(d.status)}>{d.status}</Badge>
                    <span className="font-mono font-bold text-foreground">
                      {d.event}
                    </span>
                    {d.statusCode != null && (
                      <Badge variant="default" className="font-mono">
                        HTTP {d.statusCode}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {isVi ? `Lần thử: ${d.attempts}` : `Attempts: ${d.attempts}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString(locale)}
                    </span>
                    {canManage && d.status === "FAILED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retrying}
                        onClick={() => handleRetry(d.id)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        {isVi ? "Gửi lại" : "Retry"}
                      </Button>
                    )}
                  </div>
                </div>

                {d.lastError && (
                  <p className="rounded-xl bg-danger/10 px-2.5 py-1.5 font-mono text-[11px] text-danger">
                    {d.lastError}
                  </p>
                )}

                <details className="rounded-xl bg-background/60 px-2.5 py-1.5">
                  <summary className="cursor-pointer font-semibold text-muted-foreground">
                    {isVi ? "Payload & Chữ ký HMAC" : "Payload & Signature"}
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-foreground">
                    {JSON.stringify(
                      { signature: d.signature, payload: d.payload, responseBody: d.responseBody },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
            <span>
              {isVi
                ? `Trang ${meta.page}/${meta.totalPages} (${meta.total} bản ghi)`
                : `Page ${meta.page}/${meta.totalPages} (${meta.total} total)`}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {isVi ? "Trước" : "Prev"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {isVi ? "Sau" : "Next"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

