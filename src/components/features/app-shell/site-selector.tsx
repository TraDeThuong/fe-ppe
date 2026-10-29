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
  const { data: sitesData } = useSites(
    { limit: 50 },
    { enabled: Boolean(user?.permissions.includes("PPE_SITE_READ")) }
  );

  const sites: SiteItem[] = useMemo(() => sitesData?.items ?? [], [sitesData]);

  // Find currently selected site
  const currentSite = useMemo(() => {
    if (!siteId) return null;
    return sites.find((s) => s.id === siteId) || null;
  }, [sites, siteId]);

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
        id="site-selector-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={currentSite ? currentSite.name : t("siteSelector.all")}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-elevated/60"
      >
        <Building2 className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline max-w-[140px] truncate">
          {currentSite ? currentSite.name : t("siteSelector.all")}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[min(16rem,calc(100vw-24px))] rounded-2xl border border-border/40 bg-card p-1.5 shadow-xl dark:border-black/60 dark:bg-card">
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
