"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, ShieldCheck, TriangleAlert } from "lucide-react";

import { Button } from "@ui/button";

import { useConfirmDeactivate } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { stripQueryParams } from "@/lib/safe-redirect";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";

type ConfirmStatus =
  | { kind: "loading" }
  | { kind: "confirm" }
  | { kind: "verifying" }
  | { kind: "missingToken" }
  | { kind: "invalidToken" }
  | { kind: "error" }
  | { kind: "success" };

/**
 * Trang xác nhận vô hiệu hóa tài khoản — link trong email trỏ tới
 * `/verify-email/deactivate?token=...` (mail.service.ts notification-service).
 *
 * KHÔNG tự gọi API khi mở trang: trình quét link email (SafeLinks, Gmail,
 * prerender của trình duyệt) có thể "mở" link trước người dùng → vô hiệu hóa
 * ngoài ý muốn. Trang chỉ đọc token vào ref, xóa token khỏi thanh địa chỉ
 * (history + Referer), rồi chờ người dùng bấm nút xác nhận mới gọi
 * POST /auth/deactivate/confirm. Thành công: hook đã dọn tokenStore, cache,
 * AuthContext (BE xóa cookie + revoke toàn bộ session) → màn "tạm biệt".
 *
 * Lưu ý: Nằm trong nhóm (public) nhưng user ĐANG đăng nhập khi bấm link email —
 * proxy.ts và (public) layout đều có ngoại lệ không đá về "/".
 */
export default function DeactivateConfirmPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<ConfirmStatus>({ kind: "loading" });
  const startedRef = useRef(false);
  // Token giữ trong ref (không nằm trên URL nữa) — dùng cho nút xác nhận & thử lại
  const tokenRef = useRef<string | null>(null);

  const confirm = useConfirmDeactivate({
    suppressToast: true,
    onSuccess: () => setStatus({ kind: "success" }),
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.code === ErrorCode.TOKEN_INVALID || error.code === ErrorCode.TOKEN_EXPIRED)
      ) {
        setStatus({ kind: "invalidToken" });
        return;
      }
      setStatus({ kind: "error" });
    },
  });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const token = new URLSearchParams(window.location.search).get("token")?.trim() || null;
    stripQueryParams(["token"]);
    tokenRef.current = token;
    setStatus(token ? { kind: "confirm" } : { kind: "missingToken" });
  }, []);

  function submitConfirm() {
    const token = tokenRef.current;
    if (!token) {
      setStatus({ kind: "missingToken" });
      return;
    }
    if (confirm.isPending) return;
    setStatus({ kind: "verifying" });
    confirm.mutate({ token });
  }

  // ── Đang đọc token (trước hydrate) / đang xác nhận ──
  if (status.kind === "loading" || status.kind === "verifying") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4" aria-busy="true">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {status.kind === "verifying" ? t("deactivateConfirm.verifying") : t("common.loading")}
          </p>
        </div>
      </main>
    );
  }

  // ── Chờ người dùng xác nhận (chống link scanner tự kích hoạt) ──
  if (status.kind === "confirm") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
        <div
          data-testid="deactivate-confirm-prompt"
          className="w-full max-w-md rounded-2xl sm:rounded-[1.75rem] border border-border/40 bg-card p-5 sm:p-8 text-center shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]"
        >
          <div className="flex flex-col items-center gap-4">
            <TriangleAlert className="size-10 text-warning" aria-hidden="true" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t("deactivateConfirm.confirmTitle")}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("deactivateConfirm.confirmMessage")}
            </p>
            <div className="mt-2 flex w-full flex-col gap-2">
              <Button
                variant="danger"
                className="w-full"
                disabled={confirm.isPending}
                onClick={submitConfirm}
              >
                {t("deactivateConfirm.confirmAction")}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.replace("/")}>
                {t("deactivateConfirm.cancel")}
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Thành công: màn "tạm biệt" ──
  if (status.kind === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
        <div
          data-testid="deactivate-confirm-success"
          className="w-full max-w-md rounded-2xl sm:rounded-[1.75rem] border border-border/40 bg-card p-5 sm:p-8 text-center shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]"
        >
          <div className="flex flex-col items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
              <ShieldCheck className="size-7" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t("deactivateConfirm.successTitle")}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("deactivateConfirm.successMessage")}
            </p>
            <Button className="mt-2 w-full" onClick={() => router.replace("/login")}>
              {t("deactivateConfirm.backToLogin")}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ── Link thiếu token / token hết hạn hoặc sai ──
  if (status.kind === "missingToken" || status.kind === "invalidToken") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
        <div
          data-testid="deactivate-confirm-invalid"
          className="w-full max-w-md rounded-2xl sm:rounded-[1.75rem] border border-border/40 bg-card p-5 sm:p-8 text-center shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]"
        >
          <div className="flex flex-col items-center gap-4">
            <TriangleAlert className="size-10 text-danger" aria-hidden="true" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t("deactivateConfirm.invalidTitle")}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("deactivateConfirm.invalidMessage")}
            </p>
            <Button className="mt-2 w-full" onClick={() => router.replace("/login")}>
              {t("deactivateConfirm.backToLogin")}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ── Lỗi hệ thống (mạng/5xx): cho thử lại ──
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div
        data-testid="deactivate-confirm-error"
        className="w-full max-w-md rounded-2xl sm:rounded-[1.75rem] border border-border/40 bg-card p-5 sm:p-8 text-center shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]"
      >
        <div className="flex flex-col items-center gap-4">
          <TriangleAlert className="size-10 text-warning" aria-hidden="true" />
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("deactivateConfirm.errorTitle")}
          </h1>
          <div className="flex w-full flex-col gap-2">
            <Button className="w-full" disabled={confirm.isPending} onClick={submitConfirm}>
              {t("deactivateConfirm.retry")}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.replace("/login")}>
              <LogOut className="size-4" aria-hidden="true" />
              {t("deactivateConfirm.backToLogin")}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
