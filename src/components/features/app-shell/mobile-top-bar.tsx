"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { useLocale } from "@/providers/locale-provider";
import { getMobileNavLabel, getMobileRouteMeta } from "@/config/navigation";
import { SiteSelector } from "./site-selector";

/**
 * Các trang đã đi qua trong app (phiên hiện tại). Dùng để nút quay lại biết
 * có trang trước trong app hay không: có thì quay lại đúng trang đó (giữ bộ lọc),
 * không có (mở thẳng từ link/email) thì về trang danh sách.
 */
const visitedPaths: string[] = [];

function trackVisit(pathname: string) {
  const last = visitedPaths[visitedPaths.length - 1];
  if (last === pathname) return;
  if (visitedPaths.length >= 2 && visitedPaths[visitedPaths.length - 2] === pathname) {
    visitedPaths.pop();
    return;
  }
  visitedPaths.push(pathname);
  if (visitedPaths.length > 50) visitedPaths.splice(0, visitedPaths.length - 50);
}

export interface MobileTopBarProps {
  maintenanceLocked?: boolean;
}

/** Thanh đầu trang trên mobile (< 768px): quay lại · tiêu đề · chọn công trường. */
export function MobileTopBar({ maintenanceLocked = false }: MobileTopBarProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  useEffect(() => {
    trackVisit(pathname);
  }, [pathname]);

  const meta = getMobileRouteMeta(pathname);
  const title = meta.title
    ? isVietnamese
      ? meta.title.vi
      : meta.title.en
    : meta.navItem
      ? getMobileNavLabel(meta.navItem, isVietnamese, t)
      : "Smart PPE";
  const backHref = maintenanceLocked ? undefined : meta.backHref;

  const handleBack = () => {
    if (!backHref) return;
    if (visitedPaths.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  };

  return (
    <div className="flex h-14 items-center gap-1 border-b border-border/70 bg-background px-2">
      {backHref ? (
        <button
          type="button"
          onClick={handleBack}
          aria-label={isVietnamese ? "Quay lại" : "Back"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>
      ) : (
        <span aria-hidden="true" className="w-1.5 shrink-0" />
      )}

      <p className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-foreground">
        {title}
      </p>

      {!maintenanceLocked && !backHref && <SiteSelector variant="mobile" />}
    </div>
  );
}
