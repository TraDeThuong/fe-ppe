
"use client";

import { KeyRound, ShieldCheck } from "lucide-react";

import { ChangePasswordForm } from "@/components/features/auth/forms/change-password-form";

export function PasswordPanel() {
  return (
    <div
      data-testid="password-panel"
      className="flex w-full justify-center"
    >
      <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/30 bg-transparent p-5 sm:p-7 shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)]">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-transparent text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
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
        <div className="rounded-2xl border border-border/30 bg-transparent p-4 sm:p-5 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]">
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
