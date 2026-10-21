"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import QRCode from "qrcode";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, Input, PasswordInput } from "@ui/form";

import {
  handleMutationError,
  shouldToastError,
  useDisable2FA,
  useEnable2FA,
  useRegenerateBackupCodes,
  useSetup2FA,
} from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode, type TwoFactorSetupResponse } from "@/types";
import { BackupCodesModal } from "./backup-codes-modal";

const TOTP_CODE_PATTERN = /^\d{6}$/;

interface CodeFormValues {
  code: string;
}

interface CodePasswordFormValues {
  code: string;
  password?: string;
}

/** Dùng chung cho 2 form nhỏ (tạo lại mã / tắt 2FA) khi 2FA đã bật */
type ActionError =
  | { kind: "none" }
  | { kind: "code"; message: string }
  | { kind: "password"; message: string }
  | { kind: "generic"; message: string };

/**
 * Panel 2FA trong Cài đặt bảo mật:
 * - Chưa bật: nút bật → QR (otpauthUrl) → nhập TOTP → modal backupCodes 1 lần.
 * - Đã bật: trạng thái + tạo lại mã dự phòng (TOTP + password) + tắt 2FA (code + password).
 */
export function TwoFactorPanel() {
  const { t } = useLocale();
  const { user } = useAuth();

  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const twoFactorEnabled = Boolean(user?.twoFactorEnabled);

  // ── Bước 1: khởi tạo secret + otpauthUrl (POST /auth/2fa/setup) ──
  const setup = useSetup2FA({
    suppressToast: true,
    onSuccess: (data) => setSetupData(data),
    onError: (error) => handleMutationError(error),
  });

  // ── Bước 2: render QR từ otpauthUrl (chỉ khi đã có setupData) ──
  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    if (!setupData) return;
    QRCode.toDataURL(setupData.otpauthUrl, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        // Không render được QR — user vẫn có thể nhập secret thủ công
      });
    return () => {
      cancelled = true;
    };
  }, [setupData]);

  // ── Bước 3: xác nhận mã TOTP → bật 2FA (POST /auth/2fa/enable) ──
  const enableSchema = useMemo(
    () =>
      z.object({
        code: z
          .string()
          .trim()
          .min(1, t("security.2fa.codeRequired"))
          .regex(TOTP_CODE_PATTERN, t("security.2fa.codeInvalid")),
      }),
    [t],
  );

  const enableForm = useForm<CodeFormValues>({
    resolver: zodResolver(enableSchema),
    defaultValues: { code: "" },
  });

  const enable = useEnable2FA({
    suppressToast: true,
    onSuccess: (data) => {
      // Hook đã invalidate me + set twoFactorEnabled: true — hiện modal mã dự phòng 1 lần
      setBackupCodes(data.backupCodes);
      setSetupData(null);
      enableForm.reset();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "code") {
            enableForm.setError("code", { message: fieldError.message });
          }
        }
        return;
      }
      if (!shouldToastError(error)) return;
      if (error instanceof ApiError && error.code === ErrorCode.TWO_FACTOR_INVALID_CODE) {
        enableForm.setError("code", { message: error.message });
        enableForm.setValue("code", "");
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.TWO_FACTOR_ALREADY_ENABLED) {
        handleMutationError(error);
        setSetupData(null);
        return;
      }
      handleMutationError(error);
    },
  });

  function resetSetup() {
    setSetupData(null);
    enableForm.reset();
  }

  // ── Tạo lại mã dự phòng ──
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regenerateError, setRegenerateError] = useState<ActionError>({ kind: "none" });

  const regenerateSchema = useMemo(
    () =>
      z.object({
        code: z
          .string()
          .trim()
          .min(1, t("security.2fa.codeRequired"))
          .regex(TOTP_CODE_PATTERN, t("security.2fa.codeInvalid")),
        password: z.string().optional(),
      }),
    [t],
  );

  const regenerateForm = useForm<CodePasswordFormValues>({
    resolver: zodResolver(regenerateSchema),
    defaultValues: { code: "", password: "" },
  });

  const regenerate = useRegenerateBackupCodes({
    suppressToast: true,
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setShowRegenerate(false);
      regenerateForm.reset();
      setRegenerateError({ kind: "none" });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "code" || fieldError.field === "password") {
            regenerateForm.setError(fieldError.field, { message: fieldError.message });
          }
        }
        return;
      }
      if (!shouldToastError(error)) return;
      if (error instanceof ApiError && error.code === ErrorCode.TWO_FACTOR_INVALID_CODE) {
        setRegenerateError({ kind: "code", message: error.message });
        regenerateForm.setValue("code", "");
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.INVALID_CREDENTIALS) {
        setRegenerateError({ kind: "password", message: error.message });
        regenerateForm.setValue("password", "");
        return;
      }
      setRegenerateError({ kind: "generic", message: t("changePassword.genericError") });
    },
  });

  // ── Tắt 2FA ──
  const [showDisable, setShowDisable] = useState(false);
  const [disableError, setDisableError] = useState<ActionError>({ kind: "none" });

  // Tắt 2FA nhận TOTP 6 số HOẶC backup code XXXX-XXXX (giống luồng login)
  const disableSchema = useMemo(
    () =>
      z.object({
        code: z
          .string()
          .trim()
          .min(1, t("security.2fa.codeRequired"))
          .regex(/^\d{6}$|^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/, t("security.2fa.codeInvalid")),
        password: z.string().optional(),
      }),
    [t],
  );

  const disableForm = useForm<CodePasswordFormValues>({
    resolver: zodResolver(disableSchema),
    defaultValues: { code: "", password: "" },
  });

  const disable = useDisable2FA({
    suppressToast: true,
    onSuccess: () => {
      // Hook đã invalidate me + set twoFactorEnabled: false
      setShowDisable(false);
      disableForm.reset();
      setDisableError({ kind: "none" });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "code" || fieldError.field === "password") {
            disableForm.setError(fieldError.field, { message: fieldError.message });
          }
        }
        return;
      }
      if (!shouldToastError(error)) return;
      if (error instanceof ApiError && error.code === ErrorCode.TWO_FACTOR_INVALID_CODE) {
        setDisableError({ kind: "code", message: error.message });
        disableForm.setValue("code", "");
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.INVALID_CREDENTIALS) {
        setDisableError({ kind: "password", message: error.message });
        disableForm.setValue("password", "");
        return;
      }
      setDisableError({ kind: "generic", message: t("changePassword.genericError") });
    },
  });

  // ── Render ──
  return (
    <div data-testid="two-factor-panel" className="flex flex-col gap-5">
      <BackupCodesModal codes={backupCodes} onClose={() => setBackupCodes(null)} />

      {!twoFactorEnabled && !setupData && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-muted/20 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ShieldOff className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">{t("security.2fa.disabledTitle")}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("security.2fa.disabledMessage")}
              </p>
            </div>
          </div>
          <Button type="button" disabled={setup.isPending} onClick={() => setup.mutate()}>
            {setup.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("security.2fa.settingUp")}
              </span>
            ) : (
              t("security.2fa.enableButton")
            )}
          </Button>
        </div>
      )}

      {setupData && (
        <div
          data-testid="two-factor-setup"
          className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-muted/20 p-5"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <h3 className="font-semibold text-foreground">{t("security.2fa.scanQr")}</h3>
            {qrDataUrl ? (
              <img
                data-testid="two-factor-qr"
                src={qrDataUrl}
                alt={t("security.2fa.scanQr")}
                className="size-52 rounded-xl border border-border/40 bg-background p-2"
              />
            ) : (
              <div className="flex size-52 items-center justify-center rounded-xl border border-border/40 bg-background">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("security.2fa.orEnterSecret")}{" "}
              <code className="break-all font-mono text-xs font-semibold text-foreground">
                {setupData.secret}
              </code>
            </p>
          </div>

          <form
            onSubmit={enableForm.handleSubmit((values) =>
              enable.mutate({ code: values.code.trim(), secret: setupData.secret }),
            )}
            noValidate
            className="flex flex-col gap-3"
          >
            <FormField
              id="twoFactorSetupCode"
              label={t("security.2fa.enterCode")}
              required
              error={enableForm.formState.errors.code?.message}
            >
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                disabled={enable.isPending}
                {...enableForm.register("code")}
              />
            </FormField>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={enable.isPending}
                onClick={resetSetup}
              >
                {t("security.2fa.cancel")}
              </Button>
              <Button type="submit" className="flex-1" disabled={enable.isPending}>
                {enable.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t("security.2fa.enabling")}
                  </span>
                ) : (
                  t("security.2fa.enableConfirm")
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {twoFactorEnabled && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/5 p-5">
            <span className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">{t("security.2fa.enabledTitle")}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("security.2fa.statusOn")}
              </p>
            </div>
          </div>

          {/* ── Tạo lại mã dự phòng ── */}
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowRegenerate((v) => !v)}
            >
              {t("security.2fa.regenerate")}
            </Button>

            {showRegenerate && (
              <form
                onSubmit={regenerateForm.handleSubmit((values) =>
                  regenerate.mutate({
                    code: values.code.trim(),
                    password: values.password || undefined,
                  }),
                )}
                noValidate
                className="mt-4 flex flex-col gap-3"
              >
                <FormField
                  id="regenerateCode"
                  label={t("2fa.codeLabel")}
                  required
                  error={regenerateForm.formState.errors.code?.message}
                >
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="••••••"
                    disabled={regenerate.isPending}
                    {...regenerateForm.register("code")}
                  />
                </FormField>
                <FormField
                  id="regeneratePassword"
                  label={t("security.2fa.currentPassword")}
                  error={regenerateForm.formState.errors.password?.message}
                >
                  <PasswordInput
                    autoComplete="current-password"
                    disabled={regenerate.isPending}
                    {...regenerateForm.register("password")}
                  />
                </FormField>

                {(regenerateError.kind === "code" ||
                  regenerateError.kind === "password" ||
                  regenerateError.kind === "generic") && (
                  <div
                    role="alert"
                    className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
                  >
                    {regenerateError.message}
                  </div>
                )}

                <Button type="submit" disabled={regenerate.isPending}>
                  {regenerate.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      {t("security.2fa.working")}
                    </span>
                  ) : (
                    t("security.2fa.regenerateConfirm")
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* ── Tắt 2FA ── */}
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5">
            <Button
              type="button"
              variant="outline"
              className="w-full border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => setShowDisable((v) => !v)}
            >
              {t("security.2fa.disable")}
            </Button>

            {showDisable && (
              <form
                onSubmit={disableForm.handleSubmit((values) =>
                  disable.mutate({
                    code: values.code.trim().toUpperCase(),
                    password: values.password || undefined,
                  }),
                )}
                noValidate
                className="mt-4 flex flex-col gap-3"
              >
                <FormField
                  id="disableCode"
                  label={t("2fa.codeLabel")}
                  required
                  error={disableForm.formState.errors.code?.message}
                >
                  <Input
                    autoComplete="one-time-code"
                    maxLength={11}
                    placeholder="••••••"
                    disabled={disable.isPending}
                    {...disableForm.register("code")}
                  />
                </FormField>
                <FormField
                  id="disablePassword"
                  label={t("security.2fa.currentPassword")}
                  error={disableForm.formState.errors.password?.message}
                >
                  <PasswordInput
                    autoComplete="current-password"
                    disabled={disable.isPending}
                    {...disableForm.register("password")}
                  />
                </FormField>

                {(disableError.kind === "code" ||
                  disableError.kind === "password" ||
                  disableError.kind === "generic") && (
                  <div
                    role="alert"
                    className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
                  >
                    {disableError.message}
                  </div>
                )}

                <Button type="submit" disabled={disable.isPending}>
                  {disable.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      {t("security.2fa.working")}
                    </span>
                  ) : (
                    t("security.2fa.disableConfirm")
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
