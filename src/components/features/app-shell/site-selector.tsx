"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { useLocale } from "@/providers/locale-provider";

/**
 * M1: UI placeholder — chưa gọi GET /sites (M3).
 * Giá trị chọn nằm ở SiteContext — các trang sau dùng làm global filter.
 */
export function SiteSelector() {
  const { user } = useAuth();
  const { siteId } = useSite();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Gating: ẩn hoàn toàn nếu không có quyền xem site
  if (!user?.permissions.includes("PPE_SITE_READ")) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground hover:shadow-nm-sm"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">
          {siteId ? t("siteSelector.selected") : t("siteSelector.all")}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl bg-card p-2 shadow-nm">
          {/* TODO M3: options từ useSites() + setSiteId */}
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            {t("siteSelector.placeholder")}
          </p>
        </div>
      )}
    </div>
  );
}
