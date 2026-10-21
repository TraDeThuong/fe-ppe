"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { resolveRoutePermission } from "@/config/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ForbiddenView } from "./forbidden-view";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const required = resolveRoutePermission(pathname);
  const forbidden =
    required !== undefined && !user?.permissions.includes(required);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {forbidden ? <ForbiddenView /> : children}
        </main>
      </div>
    </div>
  );
}
