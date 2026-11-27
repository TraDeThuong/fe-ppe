"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { BottomSheet } from "@ui/bottom-sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { useSites } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteSelectorProps {
  /** "mobile": nút tròn lớn + danh sách trong bảng trượt từ dưới lên */
  variant?: "default" | "mobile";
}

export function SiteSelector({ variant = "default" }: SiteSelectorProps = {}) {
  const { user } = useAuth();
  const { siteId, setSiteId } = useSite();
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
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
    // Bản mobile dùng BottomSheet (tự xử lý ESC và chạm ra ngoài).
    if (!open || variant === "mobile") return;
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
  }, [open, variant]);

  // Gating: ẩn hoàn toàn nếu không có quyền xem site
  if (!canReadSites) return null;

  if (variant === "mobile") {
    const allLabel = isVietnamese ? "Tất cả công trường" : "All sites";
    const currentLabel = currentSite ? currentSite.name : allLabel;
    // Trên nút chỉ cần "Tất cả" — icon tòa nhà đã nói đây là công trường.
    const buttonLabel = currentSite ? currentSite.name : isVietnamese ? "Tất cả" : "All";
    const options = [
      { id: null as string | null, name: allLabel },
      ...sites.map((s) => ({ id: s.id as string | null, name: s.name })),
    ];

    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${isVietnamese ? "Công trường" : "Site"}: ${currentLabel}`}
          className="flex h-11 min-w-0 max-w-46 shrink items-center gap-1.5 rounded-full border border-border/80 bg-background pl-3 pr-2.5 text-sm font-semibold text-foreground shadow-nm-sm transition-shadow active:shadow-nm-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Building2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 truncate">{buttonLabel}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>

        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          title={isVietnamese ? "Chọn công trường" : "Choose site"}
          closeLabel={isVietnamese ? "Đóng" : "Close"}
        >
          <ul className="space-y-1 pt-1">
            {options.map((option) => {
              const selected = option.id === siteId || (!option.id && !siteId);
              return (
                <li key={option.id ?? "all"}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSiteId(option.id);
                      setOpen(false);
                    }}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors ${
                      selected
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground hover:bg-foreground/5"
                    }`}
                  >
                    <Building2
                      className={`size-5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    {selected && <Check className="size-5 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </BottomSheet>
      </>
    );
  }

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
