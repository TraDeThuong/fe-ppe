"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

const SCROLL_THRESHOLD = 300;
const PAGE_SCROLL_SELECTOR = "[data-page-scroll]";

function getScrollTarget() {
  return document.querySelector<HTMLElement>(PAGE_SCROLL_SELECTOR) ?? window;
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const { t } = useLocale();

  useEffect(() => {
    let frame: number | undefined;

    const updateVisibility = () => {
      const target = getScrollTarget();
      const scrollTop =
        target instanceof HTMLElement ? target.scrollTop : window.scrollY;
      setVisible(scrollTop > SCROLL_THRESHOLD);
    };

    const scheduleUpdate = () => {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        updateVisibility();
      });
    };

    const handleScroll = (event: Event) => {
      // Ignore scrolling inside tables, sidebars, dropdowns and dialogs.
      if (
        event.target === document ||
        (event.target instanceof HTMLElement &&
          event.target.matches(PAGE_SCROLL_SELECTOR))
      ) {
        scheduleUpdate();
      }
    };

    scheduleUpdate();
    document.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label={t("common.backToTop")}
      title={t("common.backToTop")}
      onClick={() => {
        getScrollTarget().scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
      }}
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] z-40 inline-flex size-12 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-primary text-primary-foreground shadow-[6px_6px_14px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_18px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
