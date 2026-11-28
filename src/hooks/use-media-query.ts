"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Breakpoint `md` của Tailwind (48rem = 768px): từ đây trở lên là bố cục desktop. */
export const DESKTOP_MEDIA_QUERY = "(min-width: 48rem)";

/**
 * Theo dõi một media query.
 * Trên server và lúc hydrate trả về `serverValue` để HTML không bị lệch,
 * sau đó cập nhật theo kích thước thật của màn hình.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return serverValue;
    }
    return window.matchMedia(query).matches;
  }, [query, serverValue]);

  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}

/**
 * true khi màn hình từ 768px trở lên.
 * Mặc định false cho tới khi biết kích thước thật, nên component nặng (3D, biểu đồ lớn)
 * bọc trong điều kiện này sẽ không bao giờ được tải trên điện thoại.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_MEDIA_QUERY, false);
}

const subscribeNoop = () => () => {};

/** false khi render trên server và lúc hydrate; true sau khi đã chạy trên trình duyệt. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

/**
 * Chọn bản giao diện mobile/desktop mà không bị nháy, dùng cho trang có nội dung
 * render ngay từ server (chưa chờ đăng nhập):
 * - Lúc server render và hydrate: cả hai bản cùng có mặt, CSS quyết định bản nào hiện
 *   (bọc bản mobile bằng `md:hidden`, bản desktop bằng `hidden md:block`).
 * - Sau đó chỉ giữ đúng một bản, điện thoại không phải render bản desktop.
 */
export function useResponsiveVariant(): { showMobile: boolean; showDesktop: boolean } {
  const hydrated = useHydrated();
  const isDesktop = useIsDesktop();
  return { showMobile: !hydrated || !isDesktop, showDesktop: !hydrated || isDesktop };
}
