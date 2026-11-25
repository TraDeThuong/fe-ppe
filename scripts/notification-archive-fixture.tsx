import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AuthContext } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/features/app-shell/notification-bell";
import { NotificationArchiveRuntime } from "@/components/features/notifications/notification-archive-runtime";
import { ToasterProvider } from "@/components/ui/toaster";
import { useNotifications, useUnreadCount } from "@/hooks/notifications";
import { apiClient } from "@/lib/axios";
import { LocaleProvider } from "@/providers/locale-provider";
import type { MeDto } from "@/types";
import NotificationsContent from "../app/(auth)/notifications/notifications-content";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const accountKey = "archive-fixture-account";
apiClient.interceptors.request.use((config) => {
  config.headers.set("x-fixture-user", sessionStorage.getItem(accountKey) || "account-a");
  return config;
});

function FixtureCounts() {
  const { data: raw } = useNotifications({ limit: 1 });
  const { data: unread } = useUnreadCount();
  return <><output data-testid="source-total">{raw?.meta.total}</output><output data-testid="unread">{unread}</output></>;
}

function Fixture() {
  const [search, setSearch] = useState(location.search);
  const [account, setAccount] = useState(sessionStorage.getItem(accountKey) || "account-a");
  const [away, setAway] = useState(false);
  const user = { id: account, role: "SAFETY_MANAGER", permissions: ["NOTIFICATION_READ"] } as MeDto;
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const router = useMemo(() => ({
    bfcacheId: "archive-test",
    replace: (href: string) => {
      const next = new URL(href, location.origin).search;
      history.replaceState({}, "", `/${next}`);
      setSearch(next);
    },
    push: () => {}, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: async () => {},
  }), []);

  return (
    <AppRouterContext value={router}>
      <PathnameContext value={away ? "/dashboard" : "/notifications"}>
        <SearchParamsContext value={params}>
          <AuthContext value={{ user, status: "authenticated", setUser: () => {}, logout: async () => {} }}>
            <NotificationArchiveRuntime />
            <nav className="flex items-center gap-4 p-3">
              <label>Account <select value={account} onChange={(event) => {
                sessionStorage.setItem(accountKey, event.target.value);
                client.clear();
                setAccount(event.target.value);
              }}><option>account-a</option><option>account-b</option></select></label>
              <button onClick={() => setAway((previous) => !previous)}>{away ? "Open notifications" : "Go to dashboard"}</button>
              <NotificationBell />
              <FixtureCounts />
            </nav>
            {away ? <h1>Dashboard fixture</h1> : <NotificationsContent key={account} />}
            <ToasterProvider />
          </AuthContext>
        </SearchParamsContext>
      </PathnameContext>
    </AppRouterContext>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}><LocaleProvider><Fixture /></LocaleProvider></QueryClientProvider>,
);
