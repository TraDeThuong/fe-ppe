"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, ShieldCheck, TriangleAlert } from "lucide-react";

import { Button } from "@ui/button";

import { useConfirmDeactivate } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";

type ConfirmStatus =
  | { kind: "verifying" }
  | { kind: "missingToken" }
  | { kind: "invalidToken" }
  | { kind: "error" }
  | { kind: "success" };

/**
 * Trang xác nhận vô hiệu hóa tài khoản — link trong email trỏ tới
 * `/verify-email/deactivate?token=...` (mail.service.ts notification-service).
 *
 * Tự gọi POST /auth/deactivate/confirm khi mở trang. Token dùng 1 lần nên
 * guard ref chống StrictMode double-fire. Thành công: hook đã dọn tokenStore,
 * cache, AuthContext (BE xóa cookie + revoke toàn bộ session) → màn "tạm biệt".
 *
 * ⚠️ Nằm trong nhóm (public) nhưng user ĐANG đăng nhập khi bấm link email —
 * proxy.ts và (public) layout đều có ngoại lệ không đá về "/".
 */
export default function DeactivateConfirmPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<ConfirmStatus>({ kind: "verifying" });
  const startedRef = useRef(false);

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

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus({ kind: "missingToken" });
      return;
    }
    confirm.mutate({ token });
    // Chạy đúng 1 lần khi vào trang — tham chiếu confirm ổn định
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Đang xác nhận ──
  if (status.kind === "verifying") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4" aria-busy="true">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("deactivateConfirm.verifying")}</p>
        </div>
      </main>
    );
  }

  // ── Thành công: màn "tạm biệt" ──
  if (status.kind === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div
          data-testid="deactivate-confirm-success"
          className="w-full max-w-md rounded-[1.75rem] border border-border/40 bg-card p-8 text-center shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]"
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
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div
          data-testid="deactivate-confirm-invalid"
          className="w-full max-w-md rounded-[1.75rem] border border-border/40 bg-card p-8 text-center shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]"
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
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div
        data-testid="deactivate-confirm-error"
        className="w-full max-w-md rounded-[1.75rem] border border-border/40 bg-card p-8 text-center shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]"
      >
        <div className="flex flex-col items-center gap-4">
          <TriangleAlert className="size-10 text-warning" aria-hidden="true" />
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("deactivateConfirm.errorTitle")}
          </h1>
          <div className="flex w-full flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                setStatus({ kind: "verifying" });
                const token = new URLSearchParams(window.location.search).get("token");
                if (!token) {
                  setStatus({ kind: "missingToken" });
                  return;
                }
                confirm.mutate({ token });
              }}
            >
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
