"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { useSites } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export function SiteSelector() {
  const { user } = useAuth();
  const { siteId, setSiteId } = useSite();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch sites for selector
  const canReadSites = Boolean(
    user?.role === "ADMIN" ||
      user?.role === "SUPER_ADMIN" ||
      user?.permissions.includes("PPE_SITE_READ"),
  );
  const { data: sitesData, isSuccess: sitesLoaded } = useSites(
    { limit: 100 },
    { enabled: canReadSites }
  );

  const sites: SiteItem[] = useMemo(() => sitesData?.items ?? [], [sitesData]);

  // Find currently selected site
  const currentSite = useMemo(() => {
    if (!siteId) return null;
    return sites.find((s) => s.id === siteId) || null;
  }, [sites, siteId]);

  // Nếu siteId đã lưu trong localStorage không còn tồn tại hoặc không thuộc quyền user hiện tại -> reset về All sites
  useEffect(() => {
    if (!sitesLoaded || !siteId) return;
    if (!sites.some((s) => s.id === siteId)) {
      setSiteId(null);
    }
  }, [sitesLoaded, siteId, sites, setSiteId]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Gating: ẩn hoàn toàn nếu không có quyền xem site
  if (!canReadSites) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="site-selector-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={currentSite ? currentSite.name : t("siteSelector.all")}
        className="flex min-h-9 max-w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-elevated/60 sm:gap-2 sm:px-3"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="hidden min-[390px]:inline max-w-[96px] truncate sm:max-w-[140px]">
          {currentSite ? currentSite.name : t("siteSelector.all")}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[64px] z-50 rounded-2xl border border-border/40 bg-card p-1.5 shadow-xl dark:border-black/60 dark:bg-card sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-1.5 sm:w-64">
          <div className="max-h-72 overflow-y-auto space-y-1 p-0.5">
            {/* All sites option */}
            <button
              type="button"
              onClick={() => {
                setSiteId(null);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                !siteId
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-foreground hover:bg-surface-elevated"
              }`}
            >
              <span>{t("siteSelector.all")}</span>
              {!siteId && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>

            {/* Sites list */}
            {sites.map((s) => {
              const isSelected = s.id === siteId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSiteId(s.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition text-left ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-foreground hover:bg-surface-elevated"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate">{s.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {s.code}
                    </p>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
