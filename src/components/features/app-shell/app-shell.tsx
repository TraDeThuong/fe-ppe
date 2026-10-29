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
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Desktop vertical transition */}
      <div
        aria-hidden="true"
        className="
          relative z-20 hidden h-full w-4 shrink-0
          border-l border-white/95
          bg-gradient-to-r from-[var(--shadow-dark)]/50
          via-[var(--shadow-dark)]/15 to-transparent
          shadow-[inset_2px_0_5px_-1px_rgba(0,0,0,0.08)]
          dark:border-white/20
          md:flex lg:w-5
        "
      />

      {/* Main content */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />

        <main className="relative z-10 flex-1 overflow-y-auto bg-background p-3 sm:p-6 lg:p-8">
          {forbidden ? <ForbiddenView /> : children}
        </main>
      </div>
    </div>
  );
}