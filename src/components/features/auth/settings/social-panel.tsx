
"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock3,
  Fingerprint,
  Link2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlink,
} from "lucide-react";

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
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function SocialPanel() {
  const { t } = useLocale();
  const accounts = useSocialAccounts();

  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [googleParams, setGoogleParams] =
    useState<GoogleAuthUrlParams | null>(null);

  const googleUrl = useGoogleUrl(googleParams ?? undefined, {
    enabled: googleParams !== null,
    retry: false,
  });

  const unlink = useUnlinkSocial({
    suppressToast: true,

    onSuccess: () => {
      setLinkError(null);
      setConfirmUnlink(null);
    },

    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        setLinkError(error.message);
        return;
      }

      if (!shouldToastError(error)) return;
      handleMutationError(error);
    },
  });

  function handleLinkGoogle() {
    if (googleParams !== null) return;

    const state = `link:${generateOAuthState()}`;

    saveOAuthState(state);
    setLinkError(null);
    setGoogleParams({
      redirectUri: getGoogleRedirectUri(),
      state,
    });
  }

  useEffect(() => {
    if (
      googleUrl.isSuccess &&
      googleUrl.data?.url &&
      googleParams !== null
    ) {
      window.location.assign(googleUrl.data.url);
    }
  }, [googleUrl.isSuccess, googleUrl.data, googleParams]);

  useEffect(() => {
    if (googleUrl.isError && googleParams !== null) {
      handleMutationError(googleUrl.error);
      setGoogleParams(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleUrl.isError]);

  const linkedAccounts = accounts.data ?? [];

  const googleLinked = linkedAccounts.some(
    (account) => account.provider === "GOOGLE",
  );

  function handleUnlink(provider: string) {
    setLinkError(null);

    if (confirmUnlink === provider) {
      unlink.mutate(provider as "GOOGLE" | "ZALO");
      setConfirmUnlink(null);
      return;
    }

    setConfirmUnlink(provider);
  }

  if (accounts.isLoading) {
    return (
      <div
        data-testid="social-loading"
        className="relative flex items-center gap-4 overflow-hidden rounded-[24px] border border-border/50 bg-background p-5 shadow-[8px_8px_20px_rgba(0,0,0,0.06),-7px_-7px_18px_rgba(255,255,255,0.65)]"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50 text-primary shadow-[inset_4px_4px_8px_rgba(0,0,0,0.06),inset_-4px_-4px_8px_rgba(255,255,255,0.65)]">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t("security.sessions.loading")}
          </p>
          <div className="mt-2 h-1.5 max-w-40 overflow-hidden rounded-full bg-muted shadow-inner">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary/50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      data-testid="social-panel"
      className="relative isolate flex flex-col gap-5 overflow-hidden rounded-[28px] border border-border/60 bg-background p-4 shadow-[14px_14px_36px_-18px_rgba(0,0,0,0.22),-10px_-10px_30px_-18px_rgba(255,255,255,0.9)] sm:gap-6 sm:p-6"
    >
      {/* Ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 -z-10 size-72 rounded-full bg-primary/[0.08] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-24 -z-10 size-64 rounded-full bg-sky-500/[0.06] blur-3xl"
      />

      {/* Header */}
      <header className="relative flex items-start gap-4">
        <div className="relative flex size-14 shrink-0 items-center justify-center rounded-[19px] border border-primary/15 bg-background text-primary shadow-[5px_5px_12px_rgba(0,0,0,0.08),-5px_-5px_12px_rgba(255,255,255,0.7)]">
          <div className="absolute inset-1 rounded-[14px] border border-primary/10" />
          <Link2
            className="relative size-6"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-emerald-500 text-white shadow-sm">
            <Check className="size-3" aria-hidden="true" />
          </span>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Connected identities
            </span>
            <span className="size-1 rounded-full bg-border" />
            <span className="text-[10px] text-muted-foreground">
              Social authentication
            </span>
          </div>

          <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Linked accounts
          </h3>

          <p className="mt-1.5 max-w-lg text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
            Manage your connected sign-in methods and keep your account
            accessible and secure.
          </p>
        </div>
      </header>

      {/* Summary */}
      <div className="relative grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/50 bg-muted/[0.12] p-3.5 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.035),inset_-3px_-3px_8px_rgba(255,255,255,0.4)] sm:p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-background text-primary shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.65)]">
              <Fingerprint className="size-4" aria-hidden="true" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground sm:text-xs">
              Connected methods
            </span>
          </div>

          <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {linkedAccounts.length.toString().padStart(2, "0")}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Active linked accounts
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.035] p-3.5 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.025),inset_-3px_-3px_8px_rgba(255,255,255,0.4)] sm:p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-background text-emerald-600 shadow-[3px_3px_7px_rgba(0,0,0,0.06),-3px_-3px_7px_rgba(255,255,255,0.65)] dark:text-emerald-400">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground sm:text-xs">
              Account status
            </span>
          </div>

          <p className="mt-3 flex items-center gap-2 text-base font-bold tracking-tight text-foreground sm:text-lg">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_9px_rgba(16,185,129,0.45)]" />
            {linkedAccounts.length > 0 ? "Connected" : "Not linked"}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Identity overview
          </p>
        </div>
      </div>

      {/* Error banner */}
      {linkError && (
        <div
          role="alert"
          className="relative flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/[0.055] p-4 text-danger shadow-[inset_3px_3px_8px_rgba(0,0,0,0.035),inset_-3px_-3px_8px_rgba(255,255,255,0.4)]"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background shadow-[3px_3px_7px_rgba(0,0,0,0.06),-3px_-3px_7px_rgba(255,255,255,0.65)]">
            <AlertCircle className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Unable to update linked account</p>
            <p className="mt-1 text-xs leading-5">{linkError}</p>
          </div>
        </div>
      )}

      {/* Linked account list */}
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Your connections
            </h4>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Manage the services connected to your account.
            </p>
          </div>

          <span className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground shadow-[3px_3px_7px_rgba(0,0,0,0.045),-3px_-3px_7px_rgba(255,255,255,0.6)]">
            {linkedAccounts.length}{" "}
            {linkedAccounts.length === 1 ? "account" : "accounts"}
          </span>
        </div>

        <ul className="flex flex-col gap-3">
          {linkedAccounts.map((account) => {
            const pending = confirmUnlink === account.provider;
            const isGoogle = account.provider === "GOOGLE";

            return (
              <li
                key={account.id}
                data-testid={`social-item-${account.provider.toLowerCase()}`}
                className={`group relative overflow-hidden rounded-2xl border bg-background p-3.5 transition-all duration-300 sm:p-4 ${
                  pending
                    ? "border-danger/30 shadow-[inset_4px_4px_10px_rgba(220,38,38,0.055),inset_-4px_-4px_10px_rgba(255,255,255,0.5)]"
                    : "border-border/50 shadow-[6px_6px_14px_rgba(0,0,0,0.055),-5px_-5px_13px_rgba(255,255,255,0.55)] hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[9px_10px_20px_rgba(0,0,0,0.075),-5px_-5px_13px_rgba(255,255,255,0.6)]"
                }`}
              >
                <div
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 top-0 w-1 transition-colors ${
                    pending ? "bg-danger/70" : "bg-primary/25"
                  }`}
                />

                <div className="flex flex-col gap-4 pl-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl border shadow-[4px_4px_9px_rgba(0,0,0,0.07),-4px_-4px_9px_rgba(255,255,255,0.65)] ${
                        isGoogle
                          ? "border-blue-500/15 bg-blue-500/[0.06] text-blue-600 dark:text-blue-400"
                          : "border-primary/15 bg-primary/[0.06] text-primary"
                      }`}
                    >
                      {isGoogle ? (
                        <svg
                          viewBox="0 0 48 48"
                          className="size-6"
                          aria-hidden="true"
                        >
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.16 13.22l7.98 6.19C12.73 13.72 17.89 9.5 24 9.5Z"
                            transform="translate(0 4)"
                          />
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.75 7.18l7.73 6C44.42 37.95 46.98 31.88 46.98 24.55Z"
                            transform="translate(0 0)"
                          />
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
                            transform="translate(1 0)"
                          />
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.11 0-11.27-4.22-12.86-9.91l-7.98 6.19C6.51 43.62 14.62 48 24 48Z"
                            transform="translate(0 -1)"
                          />
                        </svg>
                      ) : (
                        <Link2 className="size-5" aria-hidden="true" />
                      )}

                      <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-emerald-500 text-white shadow-sm">
                        <Check className="size-2.5" aria-hidden="true" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold capitalize text-foreground">
                          {account.provider.toLowerCase()}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Linked
                        </span>
                      </div>

                      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
                        {t("security.social.linkedAt")}{" "}
                        <span className="font-medium text-foreground/75">
                          {formatDate(account.createdAt)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:pl-2">
                    {pending && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={unlink.isPending}
                        onClick={() => setConfirmUnlink(null)}
                        className="rounded-xl border-border/60 bg-background text-xs shadow-[3px_3px_7px_rgba(0,0,0,0.05),-3px_-3px_7px_rgba(255,255,255,0.5)] transition-all hover:bg-muted/40"
                      >
                        Cancel
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={unlink.isPending}
                      onClick={() => handleUnlink(account.provider)}
                      className={`group/action min-h-9 flex-1 rounded-xl transition-all duration-300 sm:flex-none ${
                        pending
                          ? "border-danger/30 bg-danger/10 text-danger shadow-[inset_3px_3px_7px_rgba(0,0,0,0.045),inset_-3px_-3px_7px_rgba(255,255,255,0.35)] hover:bg-danger/15 hover:text-danger"
                          : "border-border/60 bg-background text-muted-foreground shadow-[3px_3px_7px_rgba(0,0,0,0.055),-3px_-3px_7px_rgba(255,255,255,0.55)] hover:border-danger/25 hover:bg-danger/[0.06] hover:text-danger"
                      }`}
                    >
                      {unlink.isPending && pending ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          {t("security.2fa.working")}
                        </span>
                      ) : pending ? (
                        <span className="inline-flex items-center gap-1.5">
                          <ShieldAlert className="size-3.5" aria-hidden="true" />
                          {t("security.social.unlinkConfirm")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Unlink className="size-3.5" aria-hidden="true" />
                          {t("security.social.unlink")}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                {pending && (
                  <div className="ml-1 mt-3 flex items-start gap-2 rounded-xl border border-danger/15 bg-danger/[0.045] p-3">
                    <AlertCircle
                      className="mt-0.5 size-3.5 shrink-0 text-danger"
                      aria-hidden="true"
                    />
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      Confirm removal of this sign-in method. Make sure
                      another login method is available before proceeding.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {linkedAccounts.length === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/70 bg-muted/[0.12] px-5 py-8 text-center shadow-[inset_4px_4px_10px_rgba(0,0,0,0.035),inset_-4px_-4px_10px_rgba(255,255,255,0.4)]">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border/50 bg-background text-muted-foreground shadow-[5px_5px_12px_rgba(0,0,0,0.07),-5px_-5px_12px_rgba(255,255,255,0.6)]">
              <Link2 className="size-6" aria-hidden="true" />
            </div>

            <p className="mt-4 text-sm font-semibold text-foreground">
              {t("security.social.empty")}
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-muted-foreground">
              Connect a supported account to make signing in more
              convenient.
            </p>
          </div>
        )}
      </div>

      {/* Anti-lockout warning */}
      <div className="relative overflow-hidden rounded-2xl border border-warning/25 bg-warning/[0.045] p-4 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.03),inset_-3px_-3px_8px_rgba(255,255,255,0.4)] sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-warning shadow-[3px_3px_7px_rgba(0,0,0,0.06),-3px_-3px_7px_rgba(255,255,255,0.6)]">
            <ShieldAlert className="size-4" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground">
              Protect your access
            </p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              {t("security.social.lockoutWarning")}
            </p>
          </div>
        </div>
      </div>

      {/* Google linking */}
      {!googleLinked && (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-muted/[0.12] p-4 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.035),inset_-3px_-3px_8px_rgba(255,255,255,0.4)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background shadow-[4px_4px_9px_rgba(0,0,0,0.065),-4px_-4px_9px_rgba(255,255,255,0.65)]">
                <svg
                  viewBox="0 0 48 48"
                  className="size-5"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.16 13.22l7.98 6.19C12.73 13.72 17.89 9.5 24 9.5Z"
                    transform="translate(0 4)"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.75 7.18l7.73 6C44.42 37.95 46.98 31.88 46.98 24.55Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
                    transform="translate(1 0)"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.11 0-11.27-4.22-12.86-9.91l-7.98 6.19C6.51 43.62 14.62 48 24 48Z"
                    transform="translate(0 -1)"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  Connect Google
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  Add Google as another sign-in option.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={googleParams !== null}
              onClick={handleLinkGoogle}
              className="group/google min-h-11 w-full shrink-0 rounded-xl border-primary/20 bg-background font-semibold text-primary shadow-[5px_5px_11px_rgba(0,0,0,0.065),-4px_-4px_10px_rgba(255,255,255,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.045] hover:shadow-[7px_8px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.65)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-60 sm:w-auto sm:min-w-44"
            >
              {googleParams !== null ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("security.social.linking")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {t("security.social.linkGoogle")}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover/google:translate-x-1" />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="flex items-center justify-center gap-2 border-t border-border/40 pt-4 text-center">
        <ShieldCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <p className="text-[10px] leading-4 text-muted-foreground">
          Your linked accounts are managed through secure authentication.
        </p>
        <Sparkles className="size-3 shrink-0 text-primary/50" aria-hidden="true" />
      </footer>
    </section>
  );
}
