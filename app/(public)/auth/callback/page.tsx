"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@ui/button";

import { useGoogleLogin, useLinkSocial } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import {
  TEMP_TOKEN_STORAGE_KEY,
  clearOAuthState,
  consumeOAuthState,
  getGoogleRedirectUri,
} from "@/lib/oauth";
import { consumePendingNext, stripQueryParams } from "@/lib/safe-redirect";
import { useLocale } from "@/providers/locale-provider";

/** Tiền tố state của luồng "liên kết tài khoản Google" (sinh ở SocialPanel) */
const LINK_STATE_PREFIX = "link:";

/** Tham số Google trả về ở query — xóa khỏi thanh địa chỉ ngay sau khi đọc */
const OAUTH_CALLBACK_PARAMS = [
  "code",
  "state",
  "scope",
  "authuser",
  "prompt",
  "hd",
  "error",
  "error_description",
  "error_uri",
] as const;

/**
 * Callback Google OAuth2 — Google redirect về đây sau khi user đồng ý/ từ chối.
 *
 * 2 chế độ phân biệt qua `state`:
 * - Login (`state` thường): đổi `code` lấy phiên qua POST /auth/google →
 *   `requires2FA` → giữ tempToken, chuyển /2fa; ngược lại hook đã lưu token
 *   và AuthContext → về "/" (trang gốc chuyển tiếp /dashboard).
 * - Liên kết (`link:<uuid>`): user đã đăng nhập, muốn link Google ở
 *   /settings/security → POST /auth/social/link → về /settings/security.
 *
 * Cả hai đều so khớp `state` với bản đã lưu ở sessionStorage — không khớp =
 * CSRF → lỗi chung.
 */
type CallbackStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string; isLinkMode: boolean };

export default function GoogleCallbackPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>({ kind: "loading" });
  // StrictMode chạy effect 2 lần trong dev — chặn gửi code 2 lần
  // (Google chỉ chấp nhận đổi authorization code đúng 1 lần).
  const startedRef = useRef(false);

  const googleLogin = useGoogleLogin({
    suppressToast: true,
    onSuccess: (data) => {
      if (data.requires2FA) {
        // Luồng 2FA: giữ tempToken trong sessionStorage — trang /2fa đọc lại
        // (next đã lưu ở login-form vẫn được giữ cho /2fa dùng)
        sessionStorage.setItem(TEMP_TOKEN_STORAGE_KEY, data.tempToken);
        router.replace("/2fa");
        return;
      }
      router.replace(consumePendingNext());
    },
    onError: (error) => {
      setStatus({
        kind: "error",
        message:
          error instanceof ApiError && error.message
            ? error.message
            : t("callback.genericError"),
        isLinkMode: false,
      });
    },
  });

  const linkSocial = useLinkSocial({
    suppressToast: true,
    onSuccess: () => {
      router.replace("/settings/security");
    },
    onError: (error) => {
      setStatus({
        kind: "error",
        message:
          error instanceof ApiError && error.message
            ? error.message
            : t("callback.linkError"),
        isLinkMode: true,
      });
    },
  });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");
    // Authorization code dùng 1 lần nhưng vẫn không để lại trong history/Referer
    stripQueryParams(OAUTH_CALLBACK_PARAMS);

    // User từ chối cấp quyền trên màn hình Google (error=access_denied...)
    if (oauthError) {
      clearOAuthState();
      setStatus({
        kind: "error",
        message: t("callback.cancelled"),
        isLinkMode: Boolean(state?.startsWith(LINK_STATE_PREFIX)),
      });
      return;
    }

    // Thiếu code hoặc state không khớp bản đã lưu → nghi CSRF → lỗi chung
    if (!code || !state || !consumeOAuthState(state)) {
      setStatus({ kind: "error", message: t("callback.genericError"), isLinkMode: false });
      return;
    }

    // Nhánh liên kết tài khoản Google (đến từ SocialPanel — user đang đăng nhập)
    if (state.startsWith(LINK_STATE_PREFIX)) {
      linkSocial.mutate({ provider: "GOOGLE", code, redirectUri: getGoogleRedirectUri() });
      return;
    }

    googleLogin.mutate({ code, redirectUri: getGoogleRedirectUri() });
    // Chạy đúng 1 lần khi vào trang — tham chiếu t/googleLogin ổn định
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status.kind === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4" aria-busy="true">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("callback.verifying")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card p-5 sm:p-8 text-center shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]">
        <div className="flex flex-col items-center gap-4">
          <TriangleAlert className="size-10 text-danger" aria-hidden="true" />
          <p role="alert" className="text-sm leading-6 text-foreground">
            {status.message}
          </p>
          <Button
            className="mt-2 w-full"
            onClick={() =>
              router.replace(
                status.isLinkMode ? "/settings/security" : "/login",
              )
            }
          >
            {status.isLinkMode ? t("callback.backToSecurity") : t("callback.backToLogin")}
          </Button>
        </div>
      </div>
    </main>
  );
}
