
"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  Fingerprint,
  Loader2,
  MailCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRoundX,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, PasswordInput, Textarea } from "@ui/form";

import {
  shouldToastError,
  useRequestDeactivate,
} from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";

interface DeactivateFormValues {
  password: string;
  reason: string;
}

const REASON_MAX_LENGTH = 500;

export function DeactivatePanel() {
  const { t } = useLocale();
  const [requested, setRequested] = useState(false);
  const [failure, setFailure] = useState<{
    kind: "none" | "invalid" | "generic";
    message: string;
  }>({
    kind: "none",
    message: "",
  });

  const schema = useMemo(
    () =>
      z.object({
        password: z
          .string()
          .min(1, t("security.deactivate.passwordRequired")),
        reason: z
          .string()
          .trim()
          .max(
            REASON_MAX_LENGTH,
            t("security.deactivate.reasonTooLong"),
          ),
      }),
    [t],
  );

  const form = useForm<DeactivateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", reason: "" },
  });

  const reasonValue = form.watch("reason") ?? "";

  const requestDeactivate = useRequestDeactivate({
    suppressToast: true,

    onSuccess: () => {
      setRequested(true);
      setFailure({ kind: "none", message: "" });
      form.reset();
    },

    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.status === 422 &&
        error.errors?.length
      ) {
        for (const fieldError of error.errors) {
          if (
            fieldError.field === "password" ||
            fieldError.field === "reason"
          ) {
            form.setError(fieldError.field, {
              message: fieldError.message,
            });
          }
        }
        return;
      }

      if (!shouldToastError(error)) {
        if (
          error instanceof ApiError &&
          error.code === ErrorCode.VALIDATION_ERROR
        ) {
          setFailure({
            kind: "generic",
            message: error.message,
          });
        }
        return;
      }

      if (
        error instanceof ApiError &&
        error.code === ErrorCode.INVALID_CREDENTIALS
      ) {
        setFailure({
          kind: "invalid",
          message: error.message,
        });
        form.setValue("password", "");
        form.setFocus("password");
        return;
      }

      setFailure({
        kind: "generic",
        message: t("changePassword.genericError"),
      });
    },
  });

  function onSubmit(values: DeactivateFormValues) {
    setFailure({ kind: "none", message: "" });

    requestDeactivate.mutate({
      password: values.password,
      reason: values.reason.trim()
        ? values.reason.trim()
        : undefined,
    });
  }

  const isPending = requestDeactivate.isPending;

  if (requested) {
    return (
      <section
        data-testid="deactivate-requested"
        className="relative isolate overflow-hidden rounded-[28px] border border-emerald-500/20 bg-background p-6 shadow-[12px_12px_30px_-12px_rgba(16,185,129,0.12),-10px_-10px_28px_-16px_rgba(255,255,255,0.8)] sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-400/10 blur-3xl"
        />

        <div className="relative flex flex-col items-center gap-5 py-3 text-center">
          <div className="relative flex size-24 items-center justify-center rounded-full bg-background shadow-[inset_6px_6px_12px_rgba(0,0,0,0.07),inset_-6px_-6px_12px_rgba(255,255,255,0.8),0_12px_30px_-12px_rgba(16,185,129,0.3)]">
            <div className="flex size-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 shadow-[4px_4px_10px_rgba(16,185,129,0.12),-3px_-3px_8px_rgba(255,255,255,0.65)] dark:text-emerald-400">
              <MailCheck
                className="size-8"
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </div>

            <span className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-emerald-500 text-white shadow-md">
              <Check className="size-3.5" aria-hidden="true" />
            </span>
          </div>

          <div className="space-y-2">
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              Request submitted
            </div>

            <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {t("security.deactivate.successTitle")}
            </h3>

            <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
              {t("security.deactivate.successMessage")}
            </p>
          </div>

          <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-border/50 bg-muted/20 p-4 text-left shadow-[inset_3px_3px_7px_rgba(0,0,0,0.035),inset_-3px_-3px_7px_rgba(255,255,255,0.45)]">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs leading-5 text-muted-foreground">
              Check your inbox and follow the confirmation link to
              complete the process. The link expires after 15 minutes.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="deactivate-panel"
      className="relative isolate overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[14px_14px_36px_-18px_rgba(0,0,0,0.22),-10px_-10px_30px_-18px_rgba(255,255,255,0.9)]"
    >
      {/* Ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-rose-500/[0.07] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 size-64 rounded-full bg-orange-400/[0.05] blur-3xl"
      />

      {/* Header */}
      <div className="relative border-b border-border/50 px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
        <div className="flex items-start gap-4">
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-[18px] border border-danger/15 bg-background text-danger shadow-[5px_5px_12px_rgba(0,0,0,0.09),-4px_-4px_10px_rgba(255,255,255,0.7)]">
            <div className="absolute inset-1 rounded-[13px] border border-danger/10" />
            <UserRoundX
              className="relative size-6"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-danger text-white shadow-sm">
              <AlertTriangle className="size-2.5" />
            </span>
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-danger">
                Account control
              </span>
              <span className="size-1 rounded-full bg-border" />
              <span className="text-[10px] font-medium text-muted-foreground">
                Security settings
              </span>
            </div>

            <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {t("security.deactivate.warningTitle")}
            </h3>

            <p className="mt-1.5 max-w-xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              {t("security.deactivate.warningMessage")}
            </p>
          </div>
        </div>
      </div>

      {/* Warning card */}
      <div className="relative px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="group relative overflow-hidden rounded-2xl border border-danger/20 bg-danger/[0.035] p-4 shadow-[inset_4px_4px_10px_rgba(0,0,0,0.035),inset_-4px_-4px_10px_rgba(255,255,255,0.5)] transition-colors duration-300 hover:bg-danger/[0.055] sm:p-5">
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-danger/80 via-danger/40 to-transparent"
          />

          <div className="flex gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-danger/15 bg-background text-danger shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.7)]">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-danger sm:text-sm">
                Please review before continuing
              </p>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Your request requires email confirmation. You can
                review your decision before completing the process
                through the confirmation link.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="relative flex w-full flex-col gap-5 px-5 pb-6 pt-6 sm:px-7 sm:pb-7"
      >
        {/* Form section title */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground shadow-[inset_3px_3px_6px_rgba(0,0,0,0.06),inset_-3px_-3px_6px_rgba(255,255,255,0.65)]">
            <Fingerprint className="size-[18px]" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Verify your identity
            </h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Confirm your credentials to proceed securely.
            </p>
          </div>
        </div>

        {/* Password */}
        <div className="rounded-2xl border border-border/50 bg-muted/[0.12] p-3.5 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.035),inset_-3px_-3px_8px_rgba(255,255,255,0.35)] sm:p-4">
          <FormField
            id="deactivatePassword"
            label={t("security.deactivate.password")}
            required
            error={form.formState.errors.password?.message}
          >
            <div className="mt-2 rounded-xl border border-border/40 bg-background shadow-[inset_4px_4px_9px_rgba(0,0,0,0.065),inset_-4px_-4px_9px_rgba(255,255,255,0.7)] transition-shadow duration-300 focus-within:border-danger/35 focus-within:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.055),inset_-3px_-3px_7px_rgba(255,255,255,0.5),0_0_0_3px_rgba(239,68,68,0.07)] [&_input]:border-0 [&_input]:bg-transparent [&_input]:shadow-none [&_input]:focus-visible:ring-0">
              <PasswordInput
                autoComplete="current-password"
                disabled={isPending}
                {...form.register("password")}
              />
            </div>
          </FormField>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-4 text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Your password is used only to verify your identity.
          </p>
        </div>

        {/* Reason */}
        <div className="rounded-2xl border border-border/50 bg-muted/[0.12] p-3.5 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.035),inset_-3px_-3px_8px_rgba(255,255,255,0.35)] sm:p-4">
          <FormField
            id="deactivateReason"
            label={t("security.deactivate.reason")}
            error={form.formState.errors.reason?.message}
          >
            <div className="mt-2 overflow-hidden rounded-xl border border-border/40 bg-background shadow-[inset_4px_4px_9px_rgba(0,0,0,0.065),inset_-4px_-4px_9px_rgba(255,255,255,0.7)] transition-shadow duration-300 focus-within:border-danger/35 focus-within:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.055),inset_-3px_-3px_7px_rgba(255,255,255,0.5),0_0_0_3px_rgba(239,68,68,0.07)] [&_textarea]:min-h-24 [&_textarea]:resize-y [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:shadow-none [&_textarea]:focus-visible:ring-0">
              <Textarea
                rows={3}
                maxLength={REASON_MAX_LENGTH}
                placeholder={t("security.deactivate.reasonPlaceholder")}
                disabled={isPending}
                {...form.register("reason")}
              />
            </div>
          </FormField>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <p className="text-[10px] leading-4 text-muted-foreground">
              Optional · Help us understand your decision.
            </p>
            <span
              className={`shrink-0 rounded-lg px-2 py-1 font-mono text-[10px] tabular-nums shadow-[inset_2px_2px_4px_rgba(0,0,0,0.055),inset_-2px_-2px_4px_rgba(255,255,255,0.5)] ${
                reasonValue.length >= REASON_MAX_LENGTH
                  ? "bg-danger/10 text-danger"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {reasonValue.length}/{REASON_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* Error state */}
        {(failure.kind === "invalid" ||
          failure.kind === "generic") && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/[0.06] p-3.5 text-danger shadow-[inset_3px_3px_7px_rgba(0,0,0,0.035),inset_-3px_-3px_7px_rgba(255,255,255,0.4)]"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p className="text-xs leading-5">{failure.message}</p>
          </div>
        )}

        {/* Confirmation footer */}
        <div className="rounded-2xl border border-border/50 bg-muted/[0.12] p-4 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.035),inset_-3px_-3px_8px_rgba(255,255,255,0.35)]">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.6)]">
              <Clock3 className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Email confirmation required
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                A confirmation email will be sent to you. The link
                expires in 15 minutes. Your account is not deactivated
                by submitting this form alone.
              </p>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-col gap-3 pt-1">
          <Button
            type="submit"
            variant="outline"
            disabled={isPending}
            className="group relative min-h-12 w-full overflow-hidden rounded-xl border border-danger/30 bg-danger/[0.055] font-semibold text-danger shadow-[5px_5px_12px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:border-danger/50 hover:bg-danger/10 hover:text-danger hover:shadow-[7px_9px_16px_rgba(220,38,38,0.12),-4px_-4px_10px_rgba(255,255,255,0.65)] active:translate-y-0 active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.09),inset_-3px_-3px_8px_rgba(255,255,255,0.45)] disabled:translate-y-0 disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-danger/[0.07] to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />

            <span className="relative inline-flex items-center justify-center gap-2">
              {isPending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                  {t("security.deactivate.submitting")}
                </>
              ) : (
                <>
                  <ShieldAlert
                    className="size-4 transition-transform duration-300 group-hover:scale-110"
                    aria-hidden="true"
                  />
                  {t("security.deactivate.submit")}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </span>
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-[10px] leading-4 text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" />
            Protected by your account security verification
          </p>
        </div>
      </form>

      {/* Decorative detail */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 size-24 overflow-hidden opacity-30"
      >
        <div className="absolute -bottom-10 -right-10 size-24 rounded-full border border-danger/20" />
        <div className="absolute -bottom-6 -right-6 size-16 rounded-full border border-danger/15" />
        <Sparkles className="absolute bottom-4 right-4 size-3 text-danger/50" />
      </div>
    </section>
  );
}
