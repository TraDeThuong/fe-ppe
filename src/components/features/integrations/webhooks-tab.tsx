"use client";

import { useState } from "react";
import {
  Activity,
  Check,
  Copy,
  Edit3,
  History,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
  Webhook,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Switch } from "@/components/ui/form";
import { useCan } from "@/hooks/use-can";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type {
  CreateWebhookPayload,
  CreateWebhookResponseDto,
  UpdateWebhookPayload,
  WebhookEndpointDto,
} from "@/types";
import { WebhookDeliveriesDrawer } from "./webhook-deliveries-drawer";

const SUGGESTED_EVENTS = [
  "*",
  "ppe.incident.created",
  "ppe.incident.assigned",
  "ppe.incident.resolved",
  "user.updated",
  "system.ping",
  "job.completed",
  "job.failed",
];

export interface WebhooksTabProps {
  webhooks: WebhookEndpointDto[];
  loading?: boolean;
  onCreate: (payload: CreateWebhookPayload) => Promise<CreateWebhookResponseDto>;
  onUpdate: (id: string, payload: UpdateWebhookPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTestPing: (id: string) => Promise<{ deliveryId: string; message: string }>;
  onRetryDelivery: (deliveryId: string, webhookId: string) => Promise<void>;
  mutating?: boolean;
}

export function WebhooksTab({
  webhooks,
  loading = false,
  onCreate,
  onUpdate,
  onDelete,
  onTestPing,
  onRetryDelivery,
  mutating = false,
}: WebhooksTabProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const canManage = useCan()("WEBHOOK_MANAGE");

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<WebhookEndpointDto | null>(null);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [secret, setSecret] = useState("");
  const [eventsText, setEventsText] = useState("*");
  const [isActive, setIsActive] = useState(true);

  const [createdSecret, setCreatedSecret] = useState<CreateWebhookResponseDto | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpointDto | null>(null);
  const [deliveriesTarget, setDeliveriesTarget] = useState<WebhookEndpointDto | null>(null);

  const openCreate = () => {
    setEditingItem(null);
    setUrl("");
    setDescription("");
    setSecret("");
    setEventsText("*");
    setIsActive(true);
    setModalMode("create");
  };

  const openEdit = (item: WebhookEndpointDto) => {
    setEditingItem(item);
    setUrl(item.url);
    setDescription(item.description || "");
    setSecret("");
    setEventsText((item.events || ["*"]).join(", "));
    setIsActive(item.isActive);
    setModalMode("edit");
  };

  const parseEvents = () =>
    eventsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const events = parseEvents();
    try {
      if (modalMode === "create") {
        const created = await onCreate({
          url: url.trim(),
          description: description.trim() || undefined,
          secret: secret.trim() || undefined,
          events: events.length > 0 ? events : ["*"],
        });
        setCreatedSecret(created);
        setCopiedSecret(false);
        toast.success(isVi ? "Đã tạo Webhook thành công" : "Webhook created");
      } else if (modalMode === "edit" && editingItem) {
        await onUpdate(editingItem.id, {
          url: url.trim(),
          description: description.trim() || undefined,
          events: events.length > 0 ? events : ["*"],
          isActive,
          ...(secret.trim() ? { secret: secret.trim() } : {}),
        });
        toast.success(isVi ? "Đã cập nhật Webhook" : "Webhook updated");
      }
      setModalMode(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save webhook");
    }
  };

  const handleTestPing = async (item: WebhookEndpointDto) => {
    try {
      const res = await onTestPing(item.id);
      toast.success(
        isVi
          ? `Đã gửi system.ping (Delivery: ${res.deliveryId.slice(0, 8)}...)`
          : `Queued system.ping (${res.deliveryId.slice(0, 8)}...)`,
      );
      setDeliveriesTarget(item);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send ping");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(isVi ? "Đã xóa Webhook" : "Webhook deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete webhook");
    }
  };

  const toggleSuggestedEvent = (ev: string) => {
    const current = parseEvents();
    if (current.includes(ev)) {
      const next = current.filter((item) => item !== ev);
      setEventsText(next.length > 0 ? next.join(", ") : "*");
    } else {
      const next = ev === "*" ? ["*"] : [...current.filter((c) => c !== "*"), ev];
      setEventsText(next.join(", "));
    }
  };

  return (
    <div className="space-y-4">
      {createdSecret && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-nm-inset">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                <ShieldAlert className="h-4 w-4" />
                <span>
                  {isVi
                    ? "Lưu ngay Webhook Signing Secret (HMAC-SHA256) — Chỉ hiển thị 1 lần!"
                    : "Save Webhook Signing Secret (HMAC-SHA256) — Shown only once!"}
                </span>
              </div>
              <code className="block break-all rounded-xl bg-background/80 px-3 py-2 font-mono text-xs font-bold text-foreground">
                {createdSecret.secret}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  await navigator.clipboard.writeText(createdSecret.secret);
                  setCopiedSecret(true);
                  toast.success(isVi ? "Đã sao chép secret" : "Copied secret");
                }}
              >
                {copiedSecret ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copiedSecret ? (isVi ? "Đã chép" : "Copied") : isVi ? "Sao chép" : "Copy"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreatedSecret(null)}>
                {isVi ? "Ẩn" : "Dismiss"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {isVi ? "Danh sách Webhook Endpoints" : "Webhook Endpoints"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isVi
              ? "Nhận callback HTTP POST ký bằng HMAC-SHA256 khi có sự kiện vi phạm hoặc job hoàn tất."
              : "Receive HMAC-SHA256 signed HTTP POST callbacks when incidents or jobs occur."}
          </p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span>{isVi ? "Thêm Webhook" : "Add Webhook"}</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-surface-elevated/40" />
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-background p-10 text-center shadow-nm-inset">
          <Webhook className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            {isVi ? "Chưa có Webhook nào được đăng ký" : "No Webhooks registered yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-border/30 bg-surface p-4 shadow-nm-sm lg:flex-row lg:items-center"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.isActive ? "success" : "default"}>
                    {item.isActive
                      ? isVi
                        ? "Đang bật"
                        : "Active"
                      : isVi
                        ? "Tạm tắt"
                        : "Inactive"}
                  </Badge>
                  <span className="max-w-full break-all sm:truncate font-mono text-xs font-bold text-foreground">
                    {item.url}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Secret: {item.secretMasked}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  {(item.events || []).map((ev) => (
                    <Badge key={ev} variant="info" className="font-mono text-[10px]">
                      {ev}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeliveriesTarget(item)}
                  className="gap-1.5"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>{isVi ? "Lịch sử gửi" : "Deliveries"}</span>
                </Button>
                {canManage && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mutating}
                      onClick={() => handleTestPing(item)}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5 text-primary" />
                      <span>Test Ping</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:text-danger"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(modalMode)}
        onOpenChange={(open) => {
          if (!open) setModalMode(null);
        }}
        title={
          modalMode === "edit"
            ? isVi
              ? "Cập nhật Webhook Endpoint"
              : "Update Webhook Endpoint"
            : isVi
              ? "Đăng ký Webhook Endpoint"
              : "Register Webhook Endpoint"
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "URL đích (HTTP/HTTPS công khai) *" : "Target Public URL *"}
            </label>
            <Input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks/smart-ppe"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Mô tả" : "Description"}
            </label>
            <Input
              maxLength={255}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isVi ? "Hệ thống cảnh báo nhà máy A..." : "Plant A alert sink..."}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {isVi
                ? "Sự kiện đăng ký (phân tách bằng dấu phẩy)"
                : "Subscribed Events (comma-separated)"}
            </label>
            <Input
              required
              value={eventsText}
              onChange={(e) => setEventsText(e.target.value)}
              placeholder="*, ppe.incident.created"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTED_EVENTS.map((ev) => {
                const active = parseEvents().includes(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleSuggestedEvent(ev)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-elevated/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ev}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {isVi
                ? "Signing Secret tùy chỉnh (>= 16 ký tự, bỏ trống để giữ/tự sinh)"
                : "Custom Signing Secret (>= 16 chars, optional)"}
            </label>
            <Input
              minLength={16}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="whsec_..."
            />
          </div>

          {modalMode === "edit" && (
            <div className="flex items-center justify-between rounded-2xl p-3 shadow-nm-inset">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Activity className="h-4 w-4 text-primary" />
                <span>{isVi ? "Kích hoạt nhận sự kiện" : "Endpoint Active"}</span>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalMode(null)}>
              {isVi ? "Hủy" : "Cancel"}
            </Button>
            <Button type="submit" variant="primary" disabled={mutating}>
              {modalMode === "edit"
                ? isVi
                  ? "Lưu thay đổi"
                  : "Save Changes"
                : isVi
                  ? "Đăng ký Webhook"
                  : "Register Webhook"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        loading={mutating}
        title={isVi ? "Xóa Webhook Endpoint?" : "Delete Webhook Endpoint?"}
        description={deleteTarget?.url || ""}
        confirmText={isVi ? "Xóa" : "Delete"}
      />

      <WebhookDeliveriesDrawer
        webhook={deliveriesTarget}
        onClose={() => setDeliveriesTarget(null)}
        onRetry={onRetryDelivery}
        retrying={mutating}
      />
    </div>
  );
}

