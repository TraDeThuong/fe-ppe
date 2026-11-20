/** Actual broadcast form and query hooks; every API is intercepted by the browser regression test. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import { BroadcastNotificationModal } from "@/components/features/notifications/modals/broadcast-notification-modal";
import { useNotifications, useUnreadCount } from "@/hooks/notifications";
import { ToasterProvider } from "@/components/ui/toaster";
import { AuthContext } from "@/contexts/AuthContext";
import type { MeDto } from "@/types";

const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
function Fixture() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications({ limit: 10 });
  const { data: unread = 0 } = useUnreadCount();
  return <div className="space-y-4 p-6">
    <button onClick={() => setOpen(true)}>Mở form phát thông báo</button>
    <p data-testid="unread">Chưa đọc: {unread}</p>
    <ul>{data?.data.map((notification) => <li key={notification.id}>{notification.title}</li>)}</ul>
    <BroadcastNotificationModal open={open} onOpenChange={setOpen} />
    <ToasterProvider />
  </div>;
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={client}>
  <AuthContext value={{ user: { id: "fixture-user", role: "ADMIN", permissions: [] } as unknown as MeDto, status: "authenticated", setUser: () => {}, logout: async () => {} }}>
    <LocaleProvider><Fixture /></LocaleProvider>
  </AuthContext>
</QueryClientProvider>);
