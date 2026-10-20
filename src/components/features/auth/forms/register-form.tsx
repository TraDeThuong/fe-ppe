"use client";

import { useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Mail, MailCheck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, Input, PasswordInput } from "@ui/form";

import { shouldToastError, useRegister } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { normalizeEmail } from "@/lib/email";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";
import {
  isTurnstileConfigured,
  TurnstileField,
  type TurnstileFieldHandle,
} from "../turnstile-field";

interface RegisterFormValues {
  email: string;
  password: string;
  fullName?: string;
}

type RegisterFailure =
  | { kind: "none" }
  | { kind: "captcha"; message: string }
  | { kind: "generic"; message: string };

/** 5 tiêu chí password policy — khớp registerSchema phía BE (auth.validation.ts) */
const PASSWORD_RULES: Array<{
  id: string;
  labelKey:
    | "register.checklist.length"
    | "register.checklist.lowercase"
    | "register.checklist.uppercase"
    | "register.checklist.number"
    | "register.checklist.special";
  test: (password: string) => boolean;
}> = [
  { id: "length", labelKey: "register.checklist.length", test: (p) => p.length >= 8 },
  { id: "lowercase", labelKey: "register.checklist.lowercase", test: (p) => /[a-z]/.test(p) },
  { id: "uppercase", labelKey: "register.checklist.uppercase", test: (p) => /[A-Z]/.test(p) },
  { id: "number", labelKey: "register.checklist.number", test: (p) => /[0-9]/.test(p) },
  { id: "special", labelKey: "register.checklist.special", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

export function RegisterForm() {
  const { t } = useLocale();
  const router = useRouter();
  const turnstileRef = useRef<TurnstileFieldHandle>(null);

  const [failure, setFailure] = useState<RegisterFailure>({ kind: "none" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .transform(normalizeEmail)
          .pipe(z.string().min(1, t("register.emailRequired")))
          .pipe(z.email(t("register.emailInvalid"))),
        password: z
          .string()
          .min(1, t("register.passwordRequired"))
          .min(8, t("register.passwordInvalid"))
          .regex(/[a-z]/, t("register.passwordInvalid"))
          .regex(/[A-Z]/, t("register.passwordInvalid"))
          .regex(/[0-9]/, t("register.passwordInvalid"))
          .regex(/[^a-zA-Z0-9]/, t("register.passwordInvalid")),
        fullName: z.string().trim().optional(),
      }),
    [t],
  );

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", fullName: "" },
  });

  const register = useRegister({
    suppressToast: true,
    onSuccess: () => {
      setRegisteredEmail(normalizeEmail(form.getValues("email")));
    },
    onError: (error) => {
      // 422: lỗi theo field → gắn thẳng dưới đúng ô input
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (
            fieldError.field === "email" ||
            fieldError.field === "password" ||
            fieldError.field === "fullName"
          ) {
            form.setError(fieldError.field, { message: fieldError.message });
          }
        }
        return;
      }

      // Lỗi đã được interceptor toast toàn cục (mạng / 5xx / 429) → không hiện banner đè
      if (!shouldToastError(error)) return;

      // Token captcha chỉ dùng 1 lần — reset widget và yêu cầu tick lại
      if (
        error instanceof ApiError &&
        (error.code === ErrorCode.CAPTCHA_REQUIRED ||
          error.code === ErrorCode.CAPTCHA_INVALID)
      ) {
        setFailure({ kind: "captcha", message: t("register.captchaRequired") });
        resetTurnstileToken();
        return;
      }

      if (error instanceof ApiError) {
        setFailure({ kind: "generic", message: error.message });
        return;
      }

      setFailure({ kind: "generic", message: t("register.genericError") });
    },
  });

  const turnstileRequired = isTurnstileConfigured();
  const success = registeredEmail !== "";

  function resetTurnstileToken() {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }

  function onSubmit(values: RegisterFormValues) {
    setFailure({ kind: "none" });
    register.mutate({
      email: normalizeEmail(values.email),
      password: values.password,
      fullName: values.fullName?.trim() || undefined,
      turnstileToken: turnstileToken ?? undefined,
    });
  }

  // ── Màn "check email" (anti-enum: không tiết lộ email đã tồn tại hay chưa) ──
  if (success) {
    return (
      <div
        data-testid="register-success"
        className="flex flex-col items-center gap-4 py-6 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheck className="size-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold tracking-tight">{t("register.successTitle")}</h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {t("register.successMessage")}
        </p>
        <Button type="button" className="mt-2" onClick={() => router.replace("/login")}>
          {t("register.backToLogin")}
        </Button>
      </div>
    );
  }

  const password = form.watch("password") ?? "";
  const checks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    pass: rule.test(password),
  }));

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FormField id="fullName" label={t("register.fullName")} error={form.formState.errors.fullName?.message}>
        <Input
          autoComplete="name"
          placeholder={t("register.fullNamePlaceholder")}
          prefix={<User aria-hidden="true" />}
          disabled={register.isPending}
          {...form.register("fullName")}
        />
      </FormField>

      <FormField
        id="email"
        label={t("register.email")}
        required
        error={form.formState.errors.email?.message}
      >
        <Input
          type="email"
          autoComplete="email"
          placeholder={t("register.emailPlaceholder")}
          prefix={<Mail aria-hidden="true" />}
          disabled={register.isPending}
          {...form.register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label={t("register.password")}
        required
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          placeholder={t("register.passwordPlaceholder")}
          disabled={register.isPending}
          {...form.register("password")}
        />
      </FormField>

      {/* Checklist password policy realtime — cập nhật theo từng ký tự gõ */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground">
          {t("register.checklistTitle")}
        </p>
        <ul className="mt-2 space-y-1.5">
          {checks.map((check) => (
            <li
              key={check.id}
              data-satisfied={check.pass}
              className={[
                "flex items-center gap-2 text-xs transition-colors",
                check.pass ? "text-success" : "text-muted-foreground",
              ].join(" ")}
            >
              <Check
                className={["size-3.5", check.pass ? "text-success" : "opacity-30"].join(" ")}
                aria-hidden="true"
              />
              {t(check.labelKey)}
            </li>
          ))}
        </ul>
      </div>

      <TurnstileField
        ref={turnstileRef}
        action="register"
        onToken={setTurnstileToken}
      />

      {failure.kind === "captcha" && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning"
        >
          {failure.message}
        </div>
      )}

      {failure.kind === "generic" && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          {failure.message}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={register.isPending || (turnstileRequired && !turnstileToken)}
      >
        {register.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("register.submitting")}
          </span>
        ) : (
          t("register.submit")
        )}
      </Button>
    </form>
  );
}
