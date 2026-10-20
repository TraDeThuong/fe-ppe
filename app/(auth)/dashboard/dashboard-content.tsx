"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useLocale, LOCALES } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";
import { useRealtime } from "@/contexts/RealtimeContext";
import { Button } from "@ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ui/card";

/**
 * Nội dung trang tạm để kiểm thử Bước 3 (AuthProvider, LocaleProvider, ThemeProvider,
 * RealtimeProvider, guard) — sẽ được thay bằng dashboard thật ở các bước sau.
 */
export default function DashboardContent() {
  const { user, status, logout } = useAuth();
  const { locale, setLocale, t, number, dateTime } = useLocale();
  const { theme, setTheme } = useTheme();
  const { isConnected, lastAlert } = useRealtime();

  // Không return null — Next 16 (cacheComponents) yêu cầu segment render shell
  // không rỗng ở server, nếu không bị drop khỏi instant-navigation validation.
  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <p>{t("guard.skeleton")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6 lg:p-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.welcome")}, {user.fullName ?? user.email}
          </p>
        </div>
        <Button variant="danger" onClick={() => void logout()}>
          {t("common.logout")}
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.signedInAs")}</CardTitle>
          <CardDescription>
            {user.email} · {t("dashboard.role")}: {user.role}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-foreground sm:grid-cols-2">
          <p>
            {t("dashboard.permissions")}:{" "}
            {user.permissions.length > 0
              ? number.format(user.permissions.length)
              : "—"}
          </p>
          <p>
            {t("dashboard.createdAt")}: {dateTime.format(new Date(user.createdAt))}
          </p>
          <p>
            {t("dashboard.twoFactor")}:{" "}
            {user.twoFactorEnabled ? t("dashboard.twoFactorOn") : t("dashboard.twoFactorOff")}
          </p>
          <p>
            {t("dashboard.realtime")}:{" "}
            {isConnected ? t("dashboard.connected") : t("dashboard.disconnected")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.lastAlert")}</CardTitle>
        </CardHeader>
        <CardContent>
          {lastAlert ? (
            <pre className="overflow-auto rounded-xl bg-background p-4 text-xs text-foreground shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-4px_-4px_8px_var(--shadow-light)]">
              {JSON.stringify(lastAlert, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">{t("dashboard.noAlerts")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.themeTitle")}</CardTitle>
          <CardDescription>{t("dashboard.localeTitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {(["light", "dark", "system"] as const).map((value) => (
            <Button
              key={value}
              variant={theme === value ? "primary" : "outline"}
              size="sm"
              onClick={() => setTheme(value)}
            >
              {t(`theme.${value}`)}
            </Button>
          ))}
          <span className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
          {LOCALES.map((value) => (
            <Button
              key={value}
              variant={locale === value ? "primary" : "outline"}
              size="sm"
              onClick={() => setLocale(value)}
            >
              {value}
            </Button>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {t("dashboard.placeholderNote")}
      </p>
    </div>
  );
}
