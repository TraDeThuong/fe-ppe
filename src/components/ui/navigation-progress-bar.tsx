"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Event names cho trigger thủ công khi cần
export const NAV_START_EVENT = "ppe:nav:start";
export const NAV_COMPLETE_EVENT = "ppe:nav:complete";

export function startNavigationProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NAV_START_EVENT));
  }
}

export function stopNavigationProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NAV_COMPLETE_EVENT));
  }
}

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setVisible(true);
    setProgress(20);

    // Tăng dần tiến trình giả lập
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 60) return prev + Math.random() * 15;
        if (prev < 85) return prev + Math.random() * 5;
        return prev;
      });
    }, 200);

    // Timeout an toàn: tự hoàn thành nếu quá 8 giây
    timeoutRef.current = setTimeout(() => {
      complete();
    }, 8000);
  };

  const complete = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setProgress(100);

    // Mờ dần và ẩn thanh
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 200);
    }, 250);
  };

  // Hoàn tất progress khi pathname hoặc query string thay đổi
  useEffect(() => {
    complete();
  }, [pathname, searchParams]);

  // Lắng nghe click vào các link nội bộ và custom events
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Bỏ qua nếu bấm chuột giữa, phím tắt mở tab mới, v.v.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey
      ) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor || !anchor.href) return;

      // Bỏ qua external link hoặc download / target="_blank"
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Chỉ xử lý internal link cùng origin
        if (url.origin !== currentUrl.origin) return;

        // Bỏ qua anchor hash cùng trang (vd: #top)
        if (
          url.pathname === currentUrl.pathname &&
          url.search === currentUrl.search &&
          url.hash !== currentUrl.hash
        ) {
          return;
        }

        // Nếu đích đến khác URL hiện tại → bắt đầu hiệu ứng loading
        if (
          url.pathname !== currentUrl.pathname ||
          url.search !== currentUrl.search
        ) {
          start();
        }
      } catch {
        // Ignore invalid URL
      }
    };

    const handleCustomStart = () => start();
    const handleCustomComplete = () => complete();

    document.addEventListener("click", handleLinkClick, { capture: true });
    window.addEventListener(NAV_START_EVENT, handleCustomStart);
    window.addEventListener(NAV_COMPLETE_EVENT, handleCustomComplete);

    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true });
      window.removeEventListener(NAV_START_EVENT, handleCustomStart);
      window.removeEventListener(NAV_COMPLETE_EVENT, handleCustomComplete);
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary-light shadow-[0_0_8px_var(--primary)] transition-all duration-200 ease-out"
        style={{
          width: `${Math.min(progress, 100)}%`,
        }}
      />
    </div>
  );
}
