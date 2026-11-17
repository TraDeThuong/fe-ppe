"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Checkbox, Input } from "@/components/ui/form";
import { usePermissions } from "@/hooks/rbac";
import { useCan } from "@/hooks/use-can";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { ApiKeyItemDto, CreateApiKeyResponseDto } from "@/types";

export interface ApiKeysTabProps {
  apiKeys: ApiKeyItemDto[];
  loading?: boolean;
  onCreate: (payload: {
    name: string;
    permissions?: string[];
    expiresAt?: string;
  }) => Promise<CreateApiKeyResponseDto>;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  mutating?: boolean;
}

export function ApiKeysTab({
  apiKeys,
  loading = false,
  onCreate,
  onToggle,
  onDelete,
  mutating = false,
}: ApiKeysTabProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const canManage = useCan()("API_KEY_MANAGE");
  const { data: permissions = [] } = usePermissions();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState("");
  const [createdSecret, setCreatedSecret] = useState<CreateApiKeyResponseDto | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyItemDto | null>(null);

  const filteredPermissions = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q),
    );
  }, [permissions, permSearch]);

  const togglePermission = (permName: string) => {
    setSelectedPerms((prev) =>
      prev.includes(permName)
        ? prev.filter((item) => item !== permName)
        : [...prev, permName],
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const payload = {
        name: name.trim(),
        permissions: selectedPerms,
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      };
      const created = await onCreate(payload);
      setCreatedSecret(created);
      setCopiedSecret(false);
      setIsCreateOpen(false);
      setName("");
      setExpiresAt("");
      setSelectedPerms([]);
      toast.success(
        isVi ? "Đã tạo API Key thành công" : "API Key created successfully",
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isVi
            ? "Không thể tạo API Key"
            : "Failed to create API Key",
      );
    }
  };

  const handleCopySecret = async () => {
    if (!createdSecret?.key) return;
    await navigator.clipboard.writeText(createdSecret.key);
    setCopiedSecret(true);
    toast.success(isVi ? "Đã sao chép khóa bí mật" : "Copied API key");
  };

  const handleToggle = async (item: ApiKeyItemDto) => {
    try {
      await onToggle(item.id, !item.isActive);
      toast.success(
        isVi
          ? item.isActive
            ? "Đã tạm khóa API Key"
            : "Đã kích hoạt lại API Key"
          : item.isActive
            ? "API Key disabled"
            : "API Key enabled",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle API key",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(isVi ? "Đã thu hồi API Key" : "API Key revoked");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke API key",
      );
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
                    ? `Lưu ngay API Key "${createdSecret.name}" — Chỉ hiển thị duy nhất 1 lần!`
                    : `Save API Key "${createdSecret.name}" now — Shown only once!`}
                </span>
              </div>
              <code className="block break-all rounded-xl bg-background/80 px-3 py-2 font-mono text-xs font-bold text-foreground">
                {createdSecret.key}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={handleCopySecret}>
                {copiedSecret ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copiedSecret
                  ? isVi
                    ? "Đã chép"
                    : "Copied"
                  : isVi
                    ? "Sao chép"
                    : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCreatedSecret(null)}
              >
                {isVi ? "Ẩn" : "Dismiss"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {isVi ? "Danh sách API Keys" : "API Keys"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isVi
              ? "Xác thực tích hợp bên ngoài qua header X-API-Key với phân quyền chi tiết."
              : "Authenticate external integrations via X-API-Key header with scoped permissions."}
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{isVi ? "Tạo API Key" : "Create API Key"}</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-surface-elevated/40" />
      ) : apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-background p-10 text-center shadow-nm-inset">
          <KeyRound className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            {isVi ? "Chưa có API Key nào" : "No API Keys created yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isVi
              ? "Tạo khóa để cho phép hệ thống ngoài gọi API an toàn."
              : "Create an API key to authorize external services."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {apiKeys.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-border/30 bg-surface p-4 shadow-nm-sm"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{item.name}</span>
                      <Badge variant={item.isActive ? "success" : "default"}>
                        {item.isActive
                          ? isVi
                            ? "Đang bật"
                            : "Active"
                          : isVi
                            ? "Đã tắt"
                            : "Disabled"}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {item.prefix}••••••••
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mutating}
                        onClick={() => handleToggle(item)}
                      >
                        {item.isActive
                          ? isVi
                            ? "Tắt"
                            : "Disable"
                          : isVi
                            ? "Bật"
                            : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={mutating}
                        onClick={() => setDeleteTarget(item)}
                        className="text-danger hover:text-danger"
                        title={isVi ? "Thu hồi khóa" : "Revoke key"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {item.permissions.length === 0 ? (
                    <span className="text-[11px] italic text-muted-foreground">
                      {isVi ? "Không gán quyền (chỉ trigger job)" : "No RBAC permissions"}
                    </span>
                  ) : (
                    item.permissions.slice(0, 6).map((perm) => (
                      <Badge key={perm} variant="info" className="font-mono text-[10px]">
                        {perm}
                      </Badge>
                    ))
                  )}
                  {item.permissions.length > 6 && (
                    <Badge variant="default" className="text-[10px]">
                      +{item.permissions.length - 6}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-2 text-[11px] text-muted-foreground">
                <span>
                  {isVi ? "Dùng gần nhất:" : "Last used:"}{" "}
                  {item.lastUsedAt
                    ? new Date(item.lastUsedAt).toLocaleString(locale)
                    : isVi
                      ? "Chưa dùng"
                      : "Never"}
                </span>
                <span>
                  {isVi ? "Hết hạn:" : "Expires:"}{" "}
                  {item.expiresAt
                    ? new Date(item.expiresAt).toLocaleDateString(locale)
                    : isVi
                      ? "Không thời hạn"
                      : "Never"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title={isVi ? "Tạo API Key mới" : "Create New API Key"}
        description={
          isVi
            ? "Chọn phạm vi quyền hạn và thời hạn cho khóa tích hợp."
            : "Select permission scopes and optional expiration for this API key."
        }
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {isVi ? "Tên khóa *" : "Key Name *"}
              </label>
              <Input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ERP Safety Sync"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {isVi ? "Ngày hết hạn (tùy chọn)" : "Expiration (optional)"}
              </label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-foreground">
                {isVi
                  ? `Phạm vi quyền (${selectedPerms.length} đã chọn)`
                  : `Permission Scopes (${selectedPerms.length} selected)`}
              </label>
              <Input
                size="sm"
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                placeholder={isVi ? "Tìm quyền..." : "Filter permissions..."}
                className="max-w-[200px]"
              />
            </div>
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-2xl p-3 shadow-nm-inset sm:grid-cols-2">
              {filteredPermissions.map((perm) => (
                <label
                  key={perm.id}
                  className="flex cursor-pointer items-start gap-2 rounded-xl p-2 hover:bg-surface-elevated/40"
                >
                  <Checkbox
                    checked={selectedPerms.includes(perm.name)}
                    onCheckedChange={() => togglePermission(perm.name)}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] font-bold text-foreground">
                      {perm.name}
                    </div>
                    {perm.description && (
                      <div className="line-clamp-1 text-[10px] text-muted-foreground">
                        {perm.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
            >
              {isVi ? "Hủy" : "Cancel"}
            </Button>
            <Button type="submit" variant="primary" disabled={mutating || !name.trim()}>
              {isVi ? "Tạo khóa" : "Create Key"}
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
        title={isVi ? "Thu hồi API Key?" : "Revoke API Key?"}
        description={
          isVi
            ? `Khóa "${deleteTarget?.name}" (${deleteTarget?.prefix}...) sẽ ngừng hoạt động ngay lập tức.`
            : `Key "${deleteTarget?.name}" (${deleteTarget?.prefix}...) will immediately stop working.`
        }
        confirmText={isVi ? "Thu hồi" : "Revoke"}
      />
    </div>
  );
}

