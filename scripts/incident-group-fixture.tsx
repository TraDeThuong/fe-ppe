/** Browser harness: production incident pages, notification surfaces and dialogs; synthetic APIs only. */
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SearchParamsContext, PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AuthContext } from "@/contexts/AuthContext";
import { RealtimeContext, type PpeAlertEvent } from "@/contexts/RealtimeContext";
import { LocaleProvider } from "@/providers/locale-provider";
import { NotificationBell } from "@/components/features/app-shell/notification-bell";
import { NotificationItem } from "@/components/features/notifications/notification-item";
import { ToasterProvider, toast } from "@/components/ui/toaster";
import { useNotifications } from "@/hooks/notifications";
import { notificationService } from "@/services/notification.service";
import { apiClient } from "@/lib/axios";
import IncidentsContent from "../app/(auth)/incidents/incidents-content";
import IncidentDetailContent from "../app/(auth)/incidents/[id]/incident-detail-content";
import type { MeDto } from "@/types";

const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
apiClient.interceptors.request.use((config) => {
  config.headers.set("x-fixture-user", sessionStorage.getItem("fixture-user") || uuid(200));
  return config;
});
function Inbox() {
  const { data } = useNotifications({ limit: 100 });
  return <div data-testid="inbox" className="space-y-4">{data?.data.map((item) => <NotificationItem key={item.id} notification={item} />)}</div>;
}
function Fixture() {
  const [url, setUrl] = useState(() => location.pathname + location.search);
  const [identity, setIdentity] = useState(() => sessionStorage.getItem("fixture-role") || "manager");
  const [readable, setReadable] = useState(true);
  const [lastAlert, setLastAlert] = useState<PpeAlertEvent | null>(null);
  const userId = identity === "manager" ? uuid(200) : identity === "officer" ? uuid(201) : uuid(202);
  const user = { id: userId, email: `${identity}@example.test`, fullName: identity === "manager" ? "Nguyễn Quản Lý" : "Trần Cán Bộ", role: identity === "manager" ? "SAFETY_MANAGER" : "SAFETY_OFFICER",
    permissions: [...(readable ? ["PPE_INCIDENT_READ"] : []), "PPE_INCIDENT_UPDATE", "NOTIFICATION_READ", ...(identity === "manager" ? ["PPE_INCIDENT_MANAGE", "PPE_INCIDENT_REVIEW"] : [])],
  } as MeDto;
  sessionStorage.setItem("fixture-user", userId);
  const router = useMemo(() => {
    const navigate = (href: string, replace = false) => {
      if (replace) history.replaceState({}, "", href); else history.pushState({}, "", href);
      setUrl(location.pathname + location.search);
    };
    return { bfcacheId: "group-test", push: (href: string) => navigate(href), replace: (href: string) => navigate(href, true),
      back: () => history.back(), forward: () => history.forward(), refresh: () => { void client.invalidateQueries(); }, prefetch: async () => {} };
  }, []);
  useEffect(() => {
    const pop = () => setUrl(location.pathname + location.search);
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const parsed = new URL(url, location.origin);
  const id = parsed.pathname.match(/^\/incidents\/([^/]+)$/)?.[1];
  return <AppRouterContext value={router}><PathnameContext value={parsed.pathname}><SearchParamsContext value={parsed.searchParams}>
    <AuthContext value={{ user, status: "authenticated", setUser: () => {}, logout: async () => {} }}>
      <RealtimeContext value={{ isConnected: true, lastAlert }}>
        <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
          <nav className="flex flex-wrap items-center gap-3 rounded-xl border bg-surface p-3 text-xs">
            <label>Test account <select aria-label="Test account" value={identity} onChange={(e) => { client.clear(); setLastAlert(null); toast.dismiss(); setIdentity(e.target.value); sessionStorage.setItem("fixture-role", e.target.value); }}>
              {["manager", "officer", "other"].map((name) => <option key={name}>{name}</option>)}
            </select></label>
            <button onClick={() => router.push("/incidents")}>Incidents</button>
            <button onClick={() => router.push("/notifications")}>Inbox</button>
            <button onClick={() => setReadable((value) => !value)}>Toggle read permission</button>
            <button onClick={async () => { const data = await notificationService.getNotifications({ limit: 100 }); const item = data.data.find((row) => row.content.startsWith("[ĐIỀU PHỐI]")); if (item) setLastAlert({ type: "notification:ppe_violation", data: { ...item, cameraCode: "CAM-01", siteName: "Công trường A" } }); }}>Dispatch SSE</button>
            <button onClick={() => toast.dismiss()}>Clear notifications</button>
            <NotificationBell />
          </nav>
          {parsed.pathname === "/notifications" ? <Inbox key={userId} /> : id ? <IncidentDetailContent id={id} /> : <IncidentsContent key={userId} />}
        </div><ToasterProvider />
      </RealtimeContext>
    </AuthContext>
  </SearchParamsContext></PathnameContext></AppRouterContext>;
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={client}><LocaleProvider><Fixture /></LocaleProvider></QueryClientProvider>);
