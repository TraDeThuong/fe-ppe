
"use client";

import { KeyRound, ShieldCheck } from "lucide-react";

import { ChangePasswordForm } from "@/components/features/auth/forms/change-password-form";

export function PasswordPanel() {
  return (
    <div
      data-testid="password-panel"
      className="flex w-full justify-center"
    >
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/50 bg-background p-5 shadow-[8px_8px_20px_rgba(0,0,0,0.07),-6px_-6px_18px_rgba(255,255,255,0.65)] sm:p-7">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-background text-primary shadow-[inset_3px_3px_7px_rgba(0,0,0,0.04),inset_-3px_-3px_7px_rgba(255,255,255,0.7),4px_4px_10px_rgba(0,0,0,0.05)]">
            <KeyRound
              className="size-6"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <h3 className="text-lg font-bold tracking-tight text-foreground">
            Change password
          </h3>

          <p className="mt-1.5 max-w-xs text-xs leading-5 text-muted-foreground">
            Create a strong password to keep your account secure.
          </p>
        </div>

        {/* Password form */}
        <div className="rounded-2xl border border-border/40 bg-muted/[0.12] p-4 shadow-[inset_3px_3px_7px_rgba(0,0,0,0.035),inset_-3px_-3px_7px_rgba(255,255,255,0.4)] sm:p-5">
          <ChangePasswordForm />
        </div>

        {/* Security note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-center">
          <ShieldCheck
            className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <p className="text-[10px] leading-4 text-muted-foreground">
            Your password is protected by secure authentication.
          </p>
        </div>
      </section>
    </div>
  );
}
