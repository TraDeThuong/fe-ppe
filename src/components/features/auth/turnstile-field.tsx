"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { env } from "@/config/env";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";

let scriptPromise: Promise<void> | null = null;

/** Nạp script Turnstile đúng 1 lần cho cả app (nhiều widget dùng chung) */
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Không tải được script Turnstile"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/** Site key có được cấu hình không — form dùng để quyết định có bắt buộc token không */
export function isTurnstileConfigured(): boolean {
  return Boolean(env.turnstileSiteKey);
}

export interface TurnstileFieldProps {
  /** Action khai báo ở Cloudflare (khớp TURNSTILE_ACTION phía BE: register, resend_verification...) */
  action?: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
  className?: string;
  /** Nhận token khi người dùng vượt captcha; null khi token hết hạn/lỗi */
  onToken: (token: string | null) => void;
}

export interface TurnstileFieldHandle {
  /** Reset widget — gọi sau khi BE đã tiêu thụ token (token chỉ dùng 1 lần) */
  reset: () => void;
}

/**
 * Wrapper Cloudflare Turnstile. Khi chưa cấu hình NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * thì không render gì — BE sẽ trả CAPTCHA_REQUIRED để caller xử lý.
 */
export const TurnstileField = forwardRef<TurnstileFieldHandle, TurnstileFieldProps>(
  function TurnstileField(
    { action, theme = "auto", size = "normal", className, onToken },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;

    useImperativeHandle(
      ref,
      () => ({
        reset() {
          if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
            window.turnstile.reset(widgetIdRef.current);
            onTokenRef.current(null);
          }
        },
      }),
      [],
    );

    useEffect(() => {
      const siteKey = env.turnstileSiteKey;
      if (!siteKey) return;

      let cancelled = false;

      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action,
            theme,
            size,
            callback: (token: string) => onTokenRef.current(token),
            "expired-callback": () => onTokenRef.current(null),
            "error-callback": () => onTokenRef.current(null),
          });
        })
        .catch(() => {
          // Không tải được script — coi như chưa cấu hình, caller tự xử lý lỗi BE
        });

      return () => {
        cancelled = true;
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [action, theme, size]);

    return <div ref={containerRef} className={className} />;
  },
);

TurnstileField.displayName = "TurnstileField";
