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
