
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  Laptop,
  Link2,
  ShieldCheck,
  UserX,
  Settings2,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { DeactivatePanel } from "./deactivate-panel";
import { PasswordPanel } from "./password-panel";
import { SessionsPanel } from "./sessions-panel";
import { SocialPanel } from "./social-panel";
import { TwoFactorPanel } from "./two-factor-panel";

type SecurityTab = "2fa" | "sessions" | "social" | "password" | "deactivate";

const TABS: { id: SecurityTab; icon: typeof ShieldCheck }[] = [
  { id: "2fa", icon: ShieldCheck },
  { id: "sessions", icon: Laptop },
  { id: "social", icon: Link2 },
  { id: "password", icon: KeyRound },
  { id: "deactivate", icon: UserX },
];

export function SecuritySettingsContent() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [tab, setTab] = useState<SecurityTab>("2fa");

  if (!user) {
    return (
      <div
        data-testid="security-skeleton"
        aria-busy="true"
        className="flex min-h-[50vh] items-center justify-center bg-background px-4"
      >
        <p className="text-sm text-muted-foreground">
          {t("guard.skeleton")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Shared Page Header */}
      <PageHeader
        icon={ShieldCheck}
        title={t("security.title")}
        description={t("security.subtitle")}
        badge="Account preferences"
        badgeIcon={Settings2}
        breadcrumbs={[
          { label: t("nav.settings") || "Cài đặt tài khoản" },
          { label: t("security.title") },
        ]}
      />

      {/* Settings Navigation Bar */}
      <nav
        aria-label="Cài đặt phân mục"
        className="flex items-center gap-2 rounded-2xl border border-border/30 bg-background p-2 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
      >
        <Link
          href="/settings/profile"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-border/40 hover:bg-background hover:text-foreground hover:shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] sm:text-sm"
        >
          <UserRound className="size-4 shrink-0" />
          <span>{t("profile.tab.profile")}</span>
        </Link>

        <Link
          href="/settings/security"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--shadow-dark)]/15 bg-background px-4 py-2.5 text-xs font-semibold text-primary shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] transition-all sm:text-sm"
        >
          <ShieldCheck className="size-4 shrink-0" />
          <span>{t("profile.tab.security")}</span>
        </Link>
      </nav>

      {/* Compact security navigation */}
      <section className="rounded-2xl border border-border/30 bg-background p-2 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]">
        <nav
          aria-label={t("security.title")}
          role="tablist"
          className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5"
        >
          {TABS.map(({ id, icon: Icon }) => {
            const active = tab === id;

            return (
              <button
                key={id}
                id={`security-tab-${id}`}
                type="button"
                data-testid={`security-tab-${id}`}
                role="tab"
                aria-selected={active}
                aria-controls="security-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(event) => {
                  const currentIndex = TABS.findIndex(
                    (item) => item.id === tab,
                  );

                  let nextIndex = currentIndex;

                  if (
                    event.key === "ArrowRight" ||
                    event.key === "ArrowDown"
                  ) {
                    nextIndex = (currentIndex + 1) % TABS.length;
                  } else if (
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowUp"
                  ) {
                    nextIndex =
                      (currentIndex - 1 + TABS.length) % TABS.length;
                  } else if (event.key === "Home") {
                    nextIndex = 0;
                  } else if (event.key === "End") {
                    nextIndex = TABS.length - 1;
                  } else {
                    return;
                  }

                  event.preventDefault();
                  const nextTab = TABS[nextIndex].id;
                  setTab(nextTab);
                  document.getElementById(`security-tab-${nextTab}`)?.focus();
                }}
                className={`
                  group relative flex min-h-11 items-center justify-center gap-2
                  rounded-xl border px-3 py-2.5 text-sm font-medium
                  transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-primary focus-visible:ring-offset-2
                  focus-visible:ring-offset-background
                  ${
                    active
                      ? "border-border/40 bg-background text-primary shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
                      : "border-transparent text-muted-foreground hover:border-border/30 hover:bg-muted/20 hover:text-foreground hover:shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
                  }
                `}
              >
                <Icon
                  className={`size-4 shrink-0 transition-transform duration-200 ${
                    active
                      ? "scale-105"
                      : "group-hover:scale-110"
                  }`}
                  strokeWidth={active ? 2.2 : 1.8}
                  aria-hidden="true"
                />

                <span className="truncate">
                  {t(`security.tab.${id}`)}
                </span>

                {active && (
                  <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-primary/70" />
                )}
              </button>
            );
          })}
        </nav>
      </section>

      {/* Main content using shared PagePanel */}
      <PagePanel
        id="security-panel"
        role="tabpanel"
        aria-labelledby={`security-tab-${tab}`}
      >
        <div key={tab}>
          {tab === "2fa" && <TwoFactorPanel />}
          {tab === "sessions" && <SessionsPanel />}
          {tab === "social" && <SocialPanel />}
          {tab === "password" && <PasswordPanel />}
          {tab === "deactivate" && <DeactivatePanel />}
        </div>
      </PagePanel>
    </div>
  );
}
