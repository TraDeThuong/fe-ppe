"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, ShieldAlert, Unlink } from "lucide-react";

import { Button } from "@ui/button";

import {
  handleMutationError,
  shouldToastError,
  useGoogleUrl,
  useSocialAccounts,
  useUnlinkSocial,
} from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import {
  generateOAuthState,
  getGoogleRedirectUri,
  saveOAuthState,
} from "@/lib/oauth";
import { useLocale } from "@/providers/locale-provider";
import type { GoogleAuthUrlParams } from "@/types";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Panel tài khoản liên kết (social):
 * - Danh sách provider đã liên kết + thời điểm liên kết.
 * - Liên kết Google: sinh state `link:<uuid>` (chống CSRF) → Google consent →
 *   callback /auth/callback nhận biết nhánh "link:" → POST /auth/social/link.
 * - Hủy liên kết: inline confirm 2 lần bấm + cảnh báo anti-lockout
 *   (BE chặn hủy phương thức đăng nhập duy nhất bằng 400).
 */
export function SocialPanel() {
  const { t } = useLocale();
  const accounts = useSocialAccounts();
  const unlink = useUnlinkSocial({
    suppressToast: true,
    onSuccess: () => {
      setLinkError(null);
    },
    onError: (error) => {
      // 400 anti-lockout (phương thức đăng nhập duy nhất) → cảnh báo inline,
      // không phải toast lỗi chung chung
      if (error instanceof ApiError && error.status === 400) {
        setLinkError(error.message);
        return;
      }
      if (!shouldToastError(error)) return;
      handleMutationError(error);
    },
  });

  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Luồng liên kết Google — chỉ fetch URL khi user bấm nút (pattern như login-form)
  const [googleParams, setGoogleParams] = useState<GoogleAuthUrlParams | null>(null);
  const googleUrl = useGoogleUrl(googleParams ?? undefined, {
    enabled: googleParams !== null,
    retry: false,
  });

  function handleLinkGoogle() {
    if (googleParams !== null) return;
    const state = `link:${generateOAuthState()}`;
    saveOAuthState(state);
    setLinkError(null);
    setGoogleParams({ redirectUri: getGoogleRedirectUri(), state });
  }

  // Lấy được URL → chuyển hướng sang màn hình đồng ý của Google
  useEffect(() => {
    if (googleUrl.isSuccess && googleUrl.data?.url && googleParams !== null) {
      window.location.assign(googleUrl.data.url);
    }
  }, [googleUrl.isSuccess, googleUrl.data, googleParams]);

  // Lỗi lấy URL → toast + cho bấm lại
  useEffect(() => {
    if (googleUrl.isError && googleParams !== null) {
      handleMutationError(googleUrl.error);
      setGoogleParams(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleUrl.isError]);

  const googleLinked = Boolean(
    accounts.data?.some((account) => account.provider === "GOOGLE"),
  );

  function handleUnlink(provider: string) {
    if (confirmUnlink === provider) {
      unlink.mutate(provider as "GOOGLE" | "ZALO");
      setConfirmUnlink(null);
    } else {
      setConfirmUnlink(provider);
    }
  }

  if (accounts.isLoading) {
    return (
      <div
        data-testid="social-loading"
        className="flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/20 p-5 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {t("security.sessions.loading")}
      </div>
    );
  }

  return (
    <div data-testid="social-panel" className="flex flex-col gap-4">
      {linkError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{linkError}</span>
        </div>
      )}

      {/* Tài khoản đã liên kết */}
      <ul className="flex flex-col gap-3">
        {(accounts.data ?? []).map((account) => {
          const pending = confirmUnlink === account.provider;
          return (
            <li
              key={account.id}
              data-testid={`social-item-${account.provider.toLowerCase()}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/20 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Link2 className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold capitalize text-foreground">
                    {account.provider.toLowerCase()}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("security.social.linkedAt")} {formatDate(account.createdAt)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={unlink.isPending}
                onClick={() => handleUnlink(account.provider)}
              >
                {unlink.isPending && pending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    {t("security.2fa.working")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Unlink className="size-3.5" aria-hidden="true" />
                    {pending ? t("security.social.unlinkConfirm") : t("security.social.unlink")}
                  </span>
                )}
              </Button>
            </li>
          );
        })}
      </ul>

      {(accounts.data ?? []).length === 0 && (
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 text-sm text-muted-foreground">
          {t("security.social.empty")}
        </div>
      )}

      {/* Cảnh báo anti-lockout: đừng hủy liên kết nếu là cách đăng nhập duy nhất */}
      <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        {t("security.social.lockoutWarning")}
      </p>

      {/* Nút liên kết Google (ẩn khi đã liên kết) */}
      {!googleLinked && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={googleParams !== null}
          onClick={handleLinkGoogle}
        >
          {googleParams !== null ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t("security.social.linking")}
            </span>
          ) : (
            t("security.social.linkGoogle")
          )}
        </Button>
      )}
    </div>
  );
}
