"use client";

import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useRefreshFeedback } from "@/hooks/use-refresh-feedback";
import { useLocale } from "@/providers/locale-provider";

export interface ConsoleRefreshButtonProps {
  onRefresh: () => unknown;
  isRefreshing?: boolean;
  hasError?: boolean;
  label?: string;
  syncingLabel?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Nút Làm mới chuẩn Command Console (Neumorphism tactile + hốc lõm icon):
 * - Xoay tối thiểu 450ms dù API trả về tức thì
 * - Chuyển icon ✓ xanh + "Đã cập nhật" trong 1.5s ngay tại nút
 * - Cập nhật mốc giờ đồng bộ (HH:mm:ss) ở dòng phụ
 */
export function ConsoleRefreshButton({
  onRefresh,
  isRefreshing = false,
  hasError = false,
  label,
  syncingLabel,
  subtitle,
  compact = false,
  className = "",
  ariaLabel,
}: ConsoleRefreshButtonProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";

  const { isSpinning, isSuccess, isError, lastSyncedLabel, trigger } =
    useRefreshFeedback({
      onRefresh,
      isRefreshing,
      hasError,
    });

  const idleText = label ?? t("common.refresh");
  const activeText = syncingLabel ?? (isVi ? "Đang đồng bộ" : "Syncing");
  const doneText = isVi ? "Đã cập nhật" : "Updated";
  const errorText = isVi ? "Thử lại" : "Retry";

  const mainText = isSpinning
    ? activeText
    : isSuccess
      ? doneText
      : isError
        ? errorText
        : idleText;

  const subText = isSpinning
    ? isVi
      ? "Đang tải mới..."
      : "Fetching..."
    : lastSyncedLabel
      ? isVi
        ? `Cập nhật ${lastSyncedLabel}`
        : `Synced ${lastSyncedLabel}`
      : subtitle;

  const titleText = lastSyncedLabel
    ? isVi
      ? `${idleText} · Lần cuối: ${lastSyncedLabel}`
      : `${idleText} · Last synced: ${lastSyncedLabel}`
    : idleText;

  const stateBorderClass = isSuccess
    ? "border-emerald-500/45 text-emerald-700 dark:text-emerald-400"
    : isError
      ? "border-danger/45 text-danger"
      : "text-foreground hover:text-primary";

  const iconWellClass = isSuccess
    ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
    : isError
      ? "bg-danger/12 text-danger"
      : "text-primary";

  if (compact) {
    return (
      <button
        type="button"
        onClick={trigger}
        disabled={isSpinning}
        title={titleText}
        aria-label={ariaLabel ?? idleText}
        className={`group inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-2xl px-3.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-70 ${NM.tactileBtn} ${stateBorderClass} ${className}`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200 ${NM.recessed} ${iconWellClass}`}
        >
          {isSuccess ? (
            <Check className="size-3.5 stroke-[2.75]" />
          ) : isError ? (
            <AlertCircle className="size-3.5" />
          ) : (
            <RefreshCw
              className={`size-3.5 transition-transform duration-500 ${
                isSpinning ? "animate-spin" : "group-hover:rotate-90"
              }`}
            />
          )}
        </span>
        <span className="text-left leading-tight">
          <span className="block">{mainText}</span>
          {lastSyncedLabel && (
            <span className="block font-mono text-[9px] font-semibold text-muted-foreground tabular-nums">
              {lastSyncedLabel}
            </span>
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={isSpinning}
      title={titleText}
      aria-label={ariaLabel ?? idleText}
      className={`group/sync inline-flex shrink-0 cursor-pointer items-center gap-2.5 sm:gap-3 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] disabled:opacity-70 ${NM.tactileBtn} ${stateBorderClass} ${className}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover/sync:scale-105 ${NM.recessed} ${iconWellClass}`}
      >
        {isSuccess ? (
          <Check className="size-4 stroke-[2.75]" />
        ) : isError ? (
          <AlertCircle className="size-4" />
        ) : (
          <RefreshCw
            className={`size-4 transition-transform duration-500 ${
              isSpinning ? "animate-spin" : "group-hover/sync:rotate-180"
            }`}
          />
        )}
      </span>
      <span className="text-left leading-tight">
        <span className="block font-extrabold">{mainText}</span>
        {subText && (
          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium normal-case tracking-normal text-muted-foreground tabular-nums">
            {lastSyncedLabel && !isSpinning && (
              <span
                aria-hidden="true"
                className={`inline-block size-1.5 rounded-full ${
                  isSuccess ? "bg-emerald-500" : "bg-primary/60"
                }`}
              />
            )}
            <span>{subText}</span>
          </span>
        )}
      </span>
    </button>
  );
}

export interface RefreshButtonProps
  extends Omit<ButtonProps, "onClick" | "children"> {
  onRefresh: () => unknown;
  isRefreshing?: boolean;
  hasError?: boolean;
  label?: string;
  hideLabelOnMobile?: boolean;
  iconClassName?: string;
}

/**
 * Nút `<Button>` chuẩn có xoay tối thiểu 450ms + trạng thái ✓ "Đã cập nhật" 1.5s.
 */
export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  hasError = false,
  label,
  hideLabelOnMobile = false,
  iconClassName = "h-3.5 w-3.5",
  disabled,
  className = "",
  title,
  ...rest
}: RefreshButtonProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { isSpinning, isSuccess, isError, lastSyncedLabel, trigger } =
    useRefreshFeedback({
      onRefresh,
      isRefreshing,
      hasError,
    });

  const idleText = label ?? t("common.refresh");
  const displayText = isSuccess
    ? isVi
      ? "Đã cập nhật"
      : "Updated"
    : idleText;
  const tooltip = lastSyncedLabel
    ? `${title ?? idleText} · ${isVi ? "Cập nhật" : "Synced"} ${lastSyncedLabel}`
    : (title ?? idleText);

  const stateClass = isSuccess
    ? "!border-emerald-500/45 !text-emerald-600 dark:!text-emerald-400"
    : isError
      ? "!border-danger/45 !text-danger"
      : "";

  return (
    <Button
      type="button"
      onClick={trigger}
      disabled={Boolean(disabled) || isSpinning}
      title={tooltip}
      className={`gap-1.5 transition-colors duration-200 ${stateClass} ${className}`}
      {...rest}
    >
      {isSuccess ? (
        <Check className={`${iconClassName} stroke-[2.75]`} aria-hidden="true" />
      ) : isError ? (
        <AlertCircle className={iconClassName} aria-hidden="true" />
      ) : (
        <RefreshCw
          aria-hidden="true"
          className={`${iconClassName} ${
            isSpinning ? "animate-spin motion-reduce:animate-none" : ""
          }`}
        />
      )}
      <span className={hideLabelOnMobile ? "hidden sm:inline" : undefined}>
        {displayText}
      </span>
    </Button>
  );
}

export interface RefreshIconButtonProps {
  onRefresh: () => unknown;
  isRefreshing?: boolean;
  hasError?: boolean;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Nút icon-only (Toolbar / Card / Panel) với xoay tối thiểu 450ms + ✓ xanh 1.5s + tooltip mốc giờ.
 */
export function RefreshIconButton({
  onRefresh,
  isRefreshing = false,
  hasError = false,
  disabled = false,
  title,
  ariaLabel,
  className = "",
  iconClassName = "size-3.5",
}: RefreshIconButtonProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { isSpinning, isSuccess, isError, lastSyncedLabel, trigger } =
    useRefreshFeedback({
      onRefresh,
      isRefreshing,
      hasError,
    });

  const baseLabel = title ?? ariaLabel ?? t("common.refresh");
  const tooltip = isSuccess
    ? isVi
      ? `Đã cập nhật (${lastSyncedLabel ?? ""})`
      : `Updated (${lastSyncedLabel ?? ""})`
    : lastSyncedLabel
      ? `${baseLabel} · ${lastSyncedLabel}`
      : baseLabel;

  const stateClass = isSuccess
    ? "!border-emerald-500/50 !text-emerald-600 dark:!text-emerald-400"
    : isError
      ? "!border-danger/50 !text-danger"
      : "";

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={disabled || isSpinning}
      title={tooltip}
      aria-label={ariaLabel ?? baseLabel}
      className={`transition-all duration-200 ${className} ${stateClass}`}
    >
      {isSuccess ? (
        <Check className={`${iconClassName} stroke-[2.75]`} />
      ) : isError ? (
        <AlertCircle className={iconClassName} />
      ) : (
        <RefreshCw
          className={`${iconClassName} ${
            isSpinning ? "animate-spin text-primary" : ""
          }`}
        />
      )}
    </button>
  );
}
