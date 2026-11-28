"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  Link2Off,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Send,
  Settings2,
  ShieldOff,
  Timer,
  User,
  Users,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/use-can";
import {
  useCreateZaloLinkToken,
  useDeleteZaloAdminWebhook,
  useNotificationPreferences,
  useSendZaloTest,
  useSetZaloAdminWebhook,
  useUnlinkZalo,
  useUpdateNotificationPreference,
  useZaloAdminInfo,
  useZaloStatus,
} from "@/hooks/notifications";
import { ApiError } from "@/lib/axios";
import { useLocale } from "@/providers/locale-provider";
import type {
  NotificationSeverity,
  ZaloBotBindingDto,
  ZaloBotStatusDto,
  ZaloLinkTokenDto,
} from "@/types";

// ============================================================================
// Helpers thuần (export để unit test)
// ============================================================================

export type ZaloCardState = "loading" | "error" | "not_configured" | "not_linked" | "linked";

/** Suy ra trạng thái giao diện của card từ GET /zalo/status */
export function resolveZaloCardState(
  status: ZaloBotStatusDto | undefined,
  options: { isLoading?: boolean; isError?: boolean } = {},
): ZaloCardState {
  if (!status) {
    if (options.isError) return "error";
    return "loading";
  }
  if (!status.botConfigured || status.botMode === "disabled") return "not_configured";
  if (status.linked && status.binding) return "linked";
  return "not_linked";
}

/** Định dạng số giây còn lại thành mm:ss */
export function formatZaloCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Mốc hết hạn của mã liên kết theo đồng hồ máy khách.
 * Ưu tiên expiresInSeconds tính từ lúc nhận (tránh lệch giờ client/server), fallback expiresAt.
 */
export function computeZaloTokenDeadline(token: ZaloLinkTokenDto, receivedAt: number): number {
  if (Number.isFinite(token.expiresInSeconds) && token.expiresInSeconds > 0) {
    return receivedAt + token.expiresInSeconds * 1000;
  }
  const parsed = Date.parse(token.expiresAt);
  return Number.isNaN(parsed) ? receivedAt : parsed;
}

const SEVERITY_OPTIONS: Array<{ value: NotificationSeverity; vi: string; en: string }> = [
  { value: "LOW", vi: "Mức thấp (LOW) — Mọi vi phạm", en: "LOW — All alerts" },
  { value: "NORMAL", vi: "Bình thường (NORMAL) — Bỏ qua mức thấp", en: "NORMAL — Ignore low alerts" },
  { value: "MEDIUM", vi: "Trung bình (MEDIUM) — Từ trung bình trở lên", en: "MEDIUM — Medium & above" },
  { value: "HIGH", vi: "Mức cao (HIGH) — Khuyến nghị cho Zalo", en: "HIGH — Recommended for Zalo" },
  { value: "CRITICAL", vi: "Khẩn cấp (CRITICAL) — Chỉ vi phạm đặc biệt", en: "CRITICAL — Critical only" },
];

const CARD_CLASS =
  "flex flex-col gap-4 rounded-2xl border border-white/75 bg-surface/95 p-4 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all hover:border-primary/25 dark:border-white/[0.07] dark:bg-card/90";

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-xs font-bold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all hover:bg-primary hover:text-primary-foreground active:shadow-[inset_3px_3px_6px_var(--shadow-dark)] disabled:pointer-events-none disabled:opacity-45 dark:bg-card";

const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] transition-all hover:border-primary/40 hover:text-primary active:shadow-[inset_3px_3px_6px_var(--shadow-dark)] disabled:pointer-events-none disabled:opacity-45 dark:border-white/10 dark:bg-card";

const INSET_CLASS =
  "rounded-xl border border-black/[0.05] bg-background/80 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/[0.06]";

/** Đồng hồ 1 giây chỉ chạy khi cần (đếm ngược mã / chờ hết rate limit) */
function useNowTicker(active: boolean): [number, () => void] {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  // Gọi khi vừa đặt mốc mới (tạo mã / bị 429) để không hiển thị theo "now" cũ
  return [now, () => setNow(Date.now())];
}

function getRetryAfterSeconds(error: unknown): number | null {
  if (error instanceof ApiError && error.status === 429) {
    return error.retryAfter && error.retryAfter > 0 ? error.retryAfter : 60;
  }
  return null;
}

// ============================================================================
// Khung lệnh /link (presentational, export để test)
// ============================================================================

export function ZaloLinkCommandBox({
  command,
  remainingSeconds,
  copied,
  onCopy,
  onRegenerate,
  regenerating,
}: {
  command: string;
  remainingSeconds: number;
  copied: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const { t } = useLocale();
  const expired = remainingSeconds <= 0;

  return (
    <div className="space-y-2" data-testid="zalo-link-command">
      <span className="block text-[11px] font-semibold text-muted-foreground">
        {t("notifications.zalo.commandLabel")}
      </span>
      <div className={`flex items-center gap-2 px-3 py-2 ${INSET_CLASS} ${expired ? "opacity-50" : ""}`}>
        <code className="min-w-0 flex-1 select-all break-all font-mono text-sm font-bold text-foreground">
          {command}
        </code>
        <button
          type="button"
          onClick={onCopy}
          disabled={expired}
          aria-label={t("notifications.zalo.copy")}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/25 bg-primary/[0.07] px-2 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-45"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span>{copied ? t("notifications.zalo.copied") : t("notifications.zalo.copy")}</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {expired ? (
          <span role="status" className="font-semibold text-warning">
            {t("notifications.zalo.expired")}
          </span>
        ) : (
          <span role="timer" aria-live="off" className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
            <Timer className="size-3.5 text-primary" />
            {t("notifications.zalo.expiresIn", { time: formatZaloCountdown(remainingSeconds) })}
          </span>
        )}
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-45"
        >
          <RefreshCw className={`size-3 ${regenerating ? "animate-spin" : ""}`} />
          {t("notifications.zalo.regenerateCode")}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Thông tin hội thoại đã liên kết
// ============================================================================

function ZaloBindingInfo({ binding }: { binding: ZaloBotBindingDto }) {
  const { t, dateTime } = useLocale();
  const isGroup = binding.chatType === "GROUP";
  const linkedAt = new Date(binding.linkedAt);

  return (
    <div className={`space-y-1.5 p-3 ${INSET_CLASS}`} data-testid="zalo-binding-info">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-bold text-foreground">
          {binding.displayName || t("notifications.zalo.displayNameFallback")}
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
            isGroup
              ? "border-accent/50 bg-accent/15 text-foreground"
              : "border-primary/25 bg-primary/10 text-primary"
          }`}
        >
          {isGroup ? <Users className="size-3" /> : <User className="size-3" />}
          {t(isGroup ? "notifications.zalo.chatType.GROUP" : "notifications.zalo.chatType.PRIVATE")}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
        <dt className="text-muted-foreground">{t("notifications.zalo.chatId")}</dt>
        <dd className="font-mono font-semibold text-foreground">{binding.chatIdMasked}</dd>
        <dt className="text-muted-foreground">{t("notifications.zalo.linkedAt")}</dt>
        <dd className="font-semibold text-foreground">
          {Number.isNaN(linkedAt.getTime()) ? "—" : dateTime.format(linkedAt)}
        </dd>
      </dl>
    </div>
  );
}

// ============================================================================
// Khu vực quản trị Webhook (NOTIFICATION_TEMPLATE_MANAGE)
// ============================================================================

function ZaloAdminSection() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const adminInfo = useZaloAdminInfo({ enabled: open });
  const setWebhook = useSetZaloAdminWebhook({ onSuccess: () => setUrl("") });
  const deleteWebhook = useDeleteZaloAdminWebhook();
  const info = adminInfo.data;
  const currentWebhook = info?.webhook?.url;

  return (
    <details
      className="group/admin rounded-xl border border-border/40 px-3 py-2 text-xs dark:border-white/10"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-muted-foreground hover:text-primary">
        <Settings2 className="size-3.5" />
        {t("notifications.zalo.admin.title")}
      </summary>
      {open && (
        <div className="mt-2.5 space-y-2.5">
          {adminInfo.isLoading ? (
            <p className="text-muted-foreground">{t("notifications.zalo.loading")}</p>
          ) : adminInfo.isError || !info ? (
            <p className="text-danger">{adminInfo.error?.message || t("notifications.zalo.admin.loadError")}</p>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
              <dt className="text-muted-foreground">{t("notifications.zalo.admin.mode")}</dt>
              <dd className="font-semibold text-foreground">{t(`notifications.zalo.mode.${info.mode}`)}</dd>
              <dt className="text-muted-foreground">{t("notifications.zalo.admin.bot")}</dt>
              <dd className="font-semibold text-foreground">{info.bot?.account_name || "—"}</dd>
              <dt className="text-muted-foreground">{t("notifications.zalo.admin.webhook")}</dt>
              <dd className="break-all font-mono text-foreground">
                {currentWebhook || t("notifications.zalo.admin.noWebhook")}
              </dd>
            </dl>
          )}
          <form
            className="space-y-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = url.trim();
              if (trimmed) setWebhook.mutate(trimmed);
            }}
          >
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("notifications.zalo.admin.webhookPlaceholder")}
              aria-label={t("notifications.zalo.admin.webhook")}
              pattern="https://.*"
              className={`w-full px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 ${INSET_CLASS}`}
            />
            <p className="text-[10px] text-muted-foreground">{t("notifications.zalo.admin.webhookHint")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!url.trim() || setWebhook.isPending}
                className={PRIMARY_BUTTON_CLASS}
              >
                {setWebhook.isPending && <LoaderCircle className="size-3.5 animate-spin" />}
                {t("notifications.zalo.admin.save")}
              </button>
              {currentWebhook && (
                <button
                  type="button"
                  disabled={deleteWebhook.isPending}
                  onClick={() => deleteWebhook.mutate()}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  {deleteWebhook.isPending && <LoaderCircle className="size-3.5 animate-spin" />}
                  {t("notifications.zalo.admin.remove")}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </details>
  );
}

// ============================================================================
// Card chính
// ============================================================================

export function ZaloBotChannelCard({ className = "" }: { className?: string }) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canManage = can("NOTIFICATION_TEMPLATE_MANAGE");

  const statusQuery = useZaloStatus();
  const status = statusQuery.data;
  const cardState = resolveZaloCardState(status, {
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
  });
  const linked = cardState === "linked";

  const { data: preferences = [] } = useNotificationPreferences();
  const zaloPref = preferences.find((p) => p.channel === "ZALO_BOT") ?? {
    enabled: false,
    severityThreshold: "HIGH" as NotificationSeverity,
  };

  // Mã liên kết (chỉ giữ ở client, dùng 1 lần)
  const [token, setToken] = useState<{ data: ZaloLinkTokenDto; deadline: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  // Khi trạng thái liên kết đổi (SSE zalo_linked/zalo_unlinked hoặc thao tác Web) → bỏ mã cũ, reset lỗi
  const [prevLinked, setPrevLinked] = useState(linked);
  if (prevLinked !== linked) {
    setPrevLinked(linked);
    setToken(null);
    setInlineError(null);
    setCopied(false);
  }

  const [now, refreshNow] = useNowTicker(Boolean(token) || rateLimitUntil !== null);
  const remainingSeconds = token ? Math.ceil((token.deadline - now) / 1000) : 0;
  const rateLimitSeconds = rateLimitUntil ? Math.ceil((rateLimitUntil - now) / 1000) : 0;
  const isRateLimited = rateLimitSeconds > 0;
  if (rateLimitUntil !== null && !isRateLimited) {
    // Hết thời gian chờ → dừng đồng hồ
    setRateLimitUntil(null);
  }

  const handleRateLimit = (error: unknown) => {
    const retryAfter = getRetryAfterSeconds(error);
    if (retryAfter !== null) {
      refreshNow();
      setRateLimitUntil(Date.now() + retryAfter * 1000);
    }
  };

  const createToken = useCreateZaloLinkToken({
    onMutate: () => setInlineError(null),
    onSuccess: (data) => {
      setCopied(false);
      refreshNow();
      setToken({ data, deadline: computeZaloTokenDeadline(data, Date.now()) });
    },
    onError: handleRateLimit,
  });

  const sendTest = useSendZaloTest({
    onMutate: () => setInlineError(null),
    onError: handleRateLimit,
  });

  const unlink = useUnlinkZalo({
    onSuccess: () => setConfirmUnlink(false),
  });

  // 400 VALIDATION_ERROR (chưa liên kết) không được toast tự động → hiển thị inline
  const updatePref = useUpdateNotificationPreference({
    suppressToast: true,
    onMutate: () => setInlineError(null),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        setInlineError(error.message || t("notifications.zalo.enableRequiresLink"));
      } else {
        setInlineError(error.message || null);
      }
    },
  });

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.data.command);
      setCopied(true);
      setInlineError(null);
    } catch {
      setInlineError(t("notifications.zalo.copyFailed"));
    }
  };

  const botName = status?.botAccountName || token?.data.botAccountName || t("notifications.zalo.botFallback");
  const disabledByServer = cardState === "not_configured";

  const badge = (() => {
    switch (cardState) {
      case "linked":
        return { label: t("notifications.zalo.badge.linked"), cls: "border-success/35 bg-success/15 text-success" };
      case "not_linked":
        return { label: t("notifications.zalo.badge.notLinked"), cls: "border-border/50 bg-background/80 text-muted-foreground" };
      case "not_configured":
        return { label: t("notifications.zalo.badge.notConfigured"), cls: "border-warning/35 bg-warning/15 text-warning" };
      default:
        return null;
    }
  })();

  return (
    <div className={`${CARD_CLASS} ${className}`} data-testid="zalo-bot-card" data-state={cardState}>
      {/* Header + công tắc kênh */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-info/30 bg-gradient-to-br from-info/20 to-primary/10 text-info shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
            <MessageCircle className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">{t("notifications.channel.ZALO_BOT")}</h3>
              {badge && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("notifications.preferences.zaloDesc")}</p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={linked && zaloPref.enabled}
          aria-label={t("notifications.channel.ZALO_BOT")}
          disabled={!linked || updatePref.isPending}
          title={!linked ? t("notifications.zalo.enableRequiresLink") : undefined}
          onClick={() =>
            updatePref.mutate({
              channel: "ZALO_BOT",
              enabled: !zaloPref.enabled,
              severityThreshold: zaloPref.severityThreshold,
            })
          }
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${
            linked && zaloPref.enabled
              ? "bg-gradient-to-r from-primary to-primary/85 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.35)]"
              : "bg-background shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
          }`}
        >
          <span
            className={`pointer-events-none flex size-5 items-center justify-center rounded-full bg-surface shadow-[2px_2px_5px_rgba(0,0,0,0.25)] transition-transform duration-300 dark:bg-white ${
              linked && zaloPref.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                linked && zaloPref.enabled ? "bg-primary shadow-[0_0_5px_hsl(var(--primary))]" : "bg-muted-foreground/40"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Nội dung theo trạng thái */}
      <div className="flex flex-1 flex-col gap-3 border-t border-border/30 pt-3.5 text-xs">
        {cardState === "loading" && (
          <p className="inline-flex items-center gap-1.5 text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin" />
            {t("notifications.zalo.loading")}
          </p>
        )}

        {cardState === "error" && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-danger">{t("notifications.zalo.loadError")}</span>
            <button type="button" onClick={() => void statusQuery.refetch()} className={SECONDARY_BUTTON_CLASS}>
              <RefreshCw className="size-3.5" />
              {t("notifications.zalo.retry")}
            </button>
          </div>
        )}

        {disabledByServer && (
          <div
            role="note"
            data-testid="zalo-not-configured"
            className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/[0.08] p-3"
          >
            <ShieldOff className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="space-y-1">
              <p className="font-bold text-foreground">{t("notifications.zalo.notConfigured.title")}</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t("notifications.zalo.notConfigured.desc")}
              </p>
            </div>
          </div>
        )}

        {cardState === "not_linked" && status && (
          <>
            <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">{t("notifications.zalo.howTo")}</span>
              <ol className="list-decimal space-y-1 pl-4">
                <li>{t("notifications.zalo.howToPrivate", { bot: botName })}</li>
                {status.canJoinGroups && <li>{t("notifications.zalo.howToGroup", { bot: botName })}</li>}
              </ol>
            </div>

            {token ? (
              <>
                <ZaloLinkCommandBox
                  command={token.data.command}
                  remainingSeconds={remainingSeconds}
                  copied={copied}
                  onCopy={() => void handleCopy()}
                  onRegenerate={() => createToken.mutate()}
                  regenerating={createToken.isPending || isRateLimited}
                />
                {remainingSeconds > 0 && (
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
                    <LoaderCircle className="size-3 animate-spin text-primary" />
                    {t("notifications.zalo.waiting")}
                  </p>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => createToken.mutate()}
                disabled={createToken.isPending || isRateLimited}
                className={`${PRIMARY_BUTTON_CLASS} w-full`}
              >
                {createToken.isPending ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                {createToken.isPending ? t("notifications.zalo.creatingCode") : t("notifications.zalo.createCode")}
              </button>
            )}
          </>
        )}

        {linked && status?.binding && (
          <>
            <ZaloBindingInfo binding={status.binding} />

            <div className="flex flex-col gap-2">
              <span className="font-semibold text-foreground">{t("notifications.preferences.threshold")}:</span>
              <select
                value={zaloPref.severityThreshold}
                disabled={!zaloPref.enabled || updatePref.isPending}
                onChange={(e) =>
                  updatePref.mutate({
                    channel: "ZALO_BOT",
                    enabled: zaloPref.enabled,
                    severityThreshold: e.target.value as NotificationSeverity,
                  })
                }
                className={`w-full px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary/50 disabled:opacity-50 ${INSET_CLASS}`}
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {isVietnamese ? opt.vi : opt.en}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => sendTest.mutate(undefined)}
                disabled={sendTest.isPending || isRateLimited}
                className={PRIMARY_BUTTON_CLASS}
              >
                {sendTest.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {sendTest.isPending ? t("notifications.zalo.sendingTest") : t("notifications.zalo.sendTest")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmUnlink(true)}
                disabled={unlink.isPending}
                className={`${SECONDARY_BUTTON_CLASS} hover:border-danger/40 hover:text-danger`}
              >
                <Link2Off className="size-3.5" />
                {t("notifications.zalo.unlink")}
              </button>
            </div>
          </>
        )}

        {isRateLimited && (
          <p role="status" className="text-[11px] font-semibold text-warning">
            {t("notifications.zalo.rateLimited", { seconds: rateLimitSeconds })}
          </p>
        )}
        {inlineError && (
          <p role="alert" className="text-[11px] font-semibold text-danger">
            {inlineError}
          </p>
        )}
      </div>

      {canManage && <ZaloAdminSection />}

      <ConfirmDialog
        open={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        onConfirm={() => unlink.mutate()}
        variant="danger"
        loading={unlink.isPending}
        title={t("notifications.zalo.unlinkConfirmTitle")}
        description={t("notifications.zalo.unlinkConfirmDesc")}
        confirmText={t("notifications.zalo.unlinkConfirm")}
        cancelText={t("notifications.zalo.cancel")}
        itemName={status?.binding?.displayName || undefined}
      />
    </div>
  );
}
