"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  HardHat,
  HelpCircle,
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import type { PublicMaintenanceStatus } from "@/types";

export interface MaintenanceScreenProps {
  config?: Partial<PublicMaintenanceStatus> | null;
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  isPreview?: boolean;
  previewMode?: "desktop" | "mobile";
}

export function MaintenanceScreen({
  config,
  onRetry,
  isRetrying = false,
  isPreview = false,
  previewMode = "desktop",
}: MaintenanceScreenProps) {
  const { logout, user } = useAuth();
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const isMobilePreview = isPreview && previewMode === "mobile";

  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  const title =
    config?.title || t("maintenance.screen.defaultTitle");
  const message =
    config?.message || t("maintenance.screen.defaultMessage");
  const isReadOnly = config?.status === "READ_ONLY";

  // Countdown effect
  useEffect(() => {
    if (!config?.estimatedEndAt) {
      return;
    }

    const calculate = () => {
      const end = new Date(config.estimatedEndAt!).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isPast: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [config?.estimatedEndAt]);

  const handleLogout = async () => {
    if (isPreview) return;
    try {
      await logout();
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div
      className={`flex items-center justify-center bg-background ${
        isMobilePreview
          ? "w-full p-1"
          : isPreview
            ? "min-h-full py-4 px-2"
            : "min-h-screen px-4 py-8 sm:px-6 lg:px-8"
      }`}
    >
      {/* Background ambient lighting */}
      {!isMobilePreview && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/[0.08] blur-3xl"
        />
      )}

      <div className={`relative w-full ${isMobilePreview ? "max-w-full" : "max-w-xl"}`}>
        {/* Outer Neumorphic Card */}
        <div
          className={`relative text-center transition-all ${
            isMobilePreview
              ? "p-2 bg-transparent border-0 shadow-none"
              : "rounded-[28px] border border-white/50 bg-background p-6 shadow-[10px_10px_30px_var(--shadow-dark),-10px_-10px_30px_var(--shadow-light)] dark:border-white/10 sm:p-10"
          }`}
        >
          {/* Top 3D Neumorphic Icon with gentle pulse */}
          <div
            className={`mx-auto flex items-center justify-center border border-white/60 bg-background shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light),inset_1px_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 ${
              isMobilePreview
                ? "h-14 w-14 rounded-2xl mb-3"
                : "h-20 w-20 rounded-[24px] mb-6 shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)]"
            }`}
          >
            <div className="relative">
              {isReadOnly ? (
                <AlertTriangle
                  className={`${isMobilePreview ? "h-7 w-7" : "h-10 w-10"} text-amber-500 animate-pulse`}
                />
              ) : (
                <Wrench
                  className={`${isMobilePreview ? "h-7 w-7" : "h-10 w-10"} text-rose-500 animate-pulse`}
                />
              )}
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex h-3 w-3"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
            </div>
          </div>

          {/* Badge */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-surface text-[10px] font-bold shadow-[inset_1px_1px_3px_var(--shadow-dark)] ${
              isMobilePreview
                ? "px-2.5 py-0.5 mb-2"
                : "mb-4 px-3.5 py-1 sm:text-xs"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isReadOnly ? "bg-amber-500" : "bg-rose-500"
              }`}
            />
            <span className="text-foreground">
              {isReadOnly
                ? t("maintenance.badge.readOnly")
                : t("maintenance.screen.badge")}
            </span>
          </div>

          {/* Title & Message */}
          <h1
            className={`font-black tracking-tight text-foreground ${
              isMobilePreview ? "text-base line-clamp-2" : "text-xl sm:text-2xl"
            }`}
          >
            {title}
          </h1>

          <p
            className={`leading-relaxed text-muted-foreground ${
              isMobilePreview
                ? "text-[11px] mt-1.5 line-clamp-2"
                : "mt-3 text-xs sm:text-sm"
            }`}
          >
            {message}
          </p>

          {/* Real-time Countdown Box */}
          {config?.estimatedEndAt && !timeLeft.isPast && (
            <div
              className={`rounded-xl border border-border/30 bg-surface/70 shadow-[inset_1px_1px_4px_var(--shadow-dark)] ${
                isMobilePreview ? "mt-3 p-2.5" : "mt-6 p-4 sm:p-5 sm:rounded-2xl"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Clock className="h-3 w-3 text-primary" />
                <span>{t("maintenance.screen.countdownTitle")}</span>
              </div>

              <div
                className={`grid grid-cols-3 gap-1.5 ${
                  isMobilePreview ? "max-w-[200px]" : "max-w-xs"
                } mx-auto`}
              >
                <div
                  className={`border border-border/40 bg-background shadow-[1px_1px_4px_var(--shadow-dark)] ${
                    isMobilePreview ? "p-1 rounded-lg" : "p-2 rounded-xl"
                  }`}
                >
                  <div
                    className={`font-black text-foreground font-mono ${
                      isMobilePreview ? "text-sm" : "text-lg sm:text-2xl"
                    }`}
                  >
                    {String(timeLeft.hours).padStart(2, "0")}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                    {t("maintenance.screen.hours")}
                  </div>
                </div>

                <div
                  className={`border border-border/40 bg-background shadow-[1px_1px_4px_var(--shadow-dark)] ${
                    isMobilePreview ? "p-1 rounded-lg" : "p-2 rounded-xl"
                  }`}
                >
                  <div
                    className={`font-black text-foreground font-mono ${
                      isMobilePreview ? "text-sm" : "text-lg sm:text-2xl"
                    }`}
                  >
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                    {t("maintenance.screen.minutes")}
                  </div>
                </div>

                <div
                  className={`border border-border/40 bg-background shadow-[1px_1px_4px_var(--shadow-dark)] ${
                    isMobilePreview ? "p-1 rounded-lg" : "p-2 rounded-xl"
                  }`}
                >
                  <div
                    className={`font-black font-mono text-rose-500 ${
                      isMobilePreview ? "text-sm" : "text-lg sm:text-2xl"
                    }`}
                  >
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                    {t("maintenance.screen.seconds")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div
            className={`flex items-center justify-center ${
              isMobilePreview
                ? "mt-3 gap-2 flex-col"
                : "mt-8 gap-3 flex-col sm:flex-row"
            }`}
          >
            {onRetry && (
              <Button
                variant="primary"
                size={isMobilePreview ? "sm" : "md"}
                onClick={() => void onRetry()}
                disabled={isRetrying}
                className={`${
                  isMobilePreview ? "w-full h-8 text-xs" : "w-full sm:w-auto"
                } gap-1.5`}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying
                  ? t("maintenance.screen.retrying")
                  : t("maintenance.screen.retryBtn")}
              </Button>
            )}

            {user && (
              <Button
                variant="outline"
                size={isMobilePreview ? "sm" : "md"}
                onClick={handleLogout}
                className={`${
                  isMobilePreview ? "w-full h-8 text-xs" : "w-full sm:w-auto"
                } gap-1.5`}
              >
                <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                {t("maintenance.screen.logoutBtn")}
              </Button>
            )}
          </div>

          {/* Support footnote */}
          <div
            className={`border-t border-border/20 text-center ${
              isMobilePreview ? "mt-3 pt-2" : "mt-6 pt-4"
            }`}
          >
            <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <Mail className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">{t("maintenance.screen.support")}</span>
              <a
                href="mailto:support@smartppe.vn"
                className="font-semibold text-primary hover:underline shrink-0"
              >
                support@smartppe.vn
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
