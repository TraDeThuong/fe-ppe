"use client";

import { useState } from "react";
import { KeyRound, Laptop, Link2, ShieldCheck, UserX } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
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

/**
 * Nội dung trang /settings/security — tab shell 5 panel.
 * (auth) layout trả children qua khi user chưa sẵn sàng → tự render skeleton.
 */
export function SecuritySettingsContent() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [tab, setTab] = useState<SecurityTab>("2fa");

  if (!user) {
    return (
      <div
        data-testid="security-skeleton"
        className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center bg-background px-6 py-10"
        aria-busy="true"
      >
        <p className="text-sm text-muted-foreground">{t("guard.skeleton")}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("security.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("security.subtitle")}
          </p>
        </header>

        {/* Tab bar */}
        <nav
          aria-label={t("security.title")}
          className="flex flex-wrap justify-center gap-2"
        >
          {TABS.map(({ id, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`security-tab-${id}`}
                aria-selected={active}
                role="tab"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {t(`security.tab.${id}`)}
              </button>
            );
          })}
        </nav>

        {/* Panel theo tab đang chọn */}
        <section className="rounded-[1.75rem] border border-border/40 bg-background p-6 shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]">
          {tab === "2fa" && <TwoFactorPanel />}
          {tab === "sessions" && <SessionsPanel />}
          {tab === "social" && <SocialPanel />}
          {tab === "password" && <PasswordPanel />}
          {tab === "deactivate" && <DeactivatePanel />}
        </section>
      </div>
    </main>
  );
}
