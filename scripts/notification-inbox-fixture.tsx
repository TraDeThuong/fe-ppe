import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AuthContext } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/providers/locale-provider";
import { NotificationList } from "@/components/features/notifications/notification-list";
import { NotificationKpiSummary } from "@/components/features/notifications/notification-kpi-summary";
import { NotificationBell } from "@/components/features/app-shell/notification-bell";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useDeleteNotification, notificationKeys } from "@/hooks/notifications";
import { ToasterProvider } from "@/components/ui/toaster";
import { apiClient } from "@/lib/axios";
import type { MeDto } from "@/types";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const router = { bfcacheId: "inbox-test", push: () => {}, replace: () => {}, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: async () => {} };
apiClient.interceptors.request.use((config) => { config.headers.set("x-fixture-user", sessionStorage.getItem("inbox-user") || "account-a"); return config; });
function Inbox() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [read, setRead] = useState("all");
  const query = useNotifications({ page, limit: 10, search, isRead: read === "all" ? undefined : read === "read" });
  const { data: unread } = useUnreadCount();
  const mark = useMarkAsRead(), all = useMarkAllAsRead(), remove = useDeleteNotification();
  return <>
    <nav className="flex flex-wrap gap-3 p-3"><input aria-label="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      <select aria-label="Read filter" value={read} onChange={(e) => { setRead(e.target.value); setPage(1); }}><option value="all">all</option><option value="read">read</option><option value="unread">unread</option></select>
      <button onClick={() => all.mutate()}>Read all</button><button onClick={() => void query.refetch()}>Refresh inbox</button><NotificationBell /></nav>
    <output data-testid="total">{query.data?.meta.total ?? "—"}</output><output data-testid="unread">{unread ?? "—"}</output>
    <NotificationKpiSummary notifications={query.data?.data} totalCount={query.data?.meta.total} unreadCount={unread} loading={query.isLoading} unavailable={!query.data && !!query.error} />
    <NotificationList items={query.data?.data ?? []} {...query.data?.meta} isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()}
      onPageChange={setPage} onMarkAsRead={(id) => mark.mutate(id)} onDelete={(id) => remove.mutate(id)} markingReadId={mark.isPending ? mark.variables : null} deletingId={remove.isPending ? remove.variables : null} />
  </>;
}
function Fixture() {
  const [account, setAccount] = useState(sessionStorage.getItem("inbox-user") || "account-a");
  sessionStorage.setItem("inbox-user", account);
  const user = { id: account, role: "ADMIN", permissions: [] } as unknown as MeDto;
  return <AuthContext value={{ user, status: "authenticated", setUser: () => {}, logout: async () => {} }}><div className="mx-auto max-w-5xl space-y-3 p-4">
    <label>Account <select aria-label="Account" value={account} onChange={(e) => { setAccount(e.target.value); void client.invalidateQueries({ queryKey: notificationKeys.lists() }); }}><option>account-a</option><option>account-b</option></select></label>
    <Inbox key={account} /></div><ToasterProvider /></AuthContext>;
}
createRoot(document.getElementById("root")!).render(<AppRouterContext value={router}><QueryClientProvider client={client}><LocaleProvider><Fixture /></LocaleProvider></QueryClientProvider></AppRouterContext>);
