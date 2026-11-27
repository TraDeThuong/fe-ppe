"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface MobileChromeContextValue {
  tabBarHidden: boolean;
  setTabBarHidden: (hidden: boolean) => void;
}

const MobileChromeContext = createContext<MobileChromeContextValue | null>(null);

/** Đặt tại AppShell: cho phép một trang tạm ẩn thanh tab đáy trên mobile. */
export function MobileChromeProvider({ children }: { children: ReactNode }) {
  const [tabBarHidden, setTabBarHidden] = useState(false);
  const value = useMemo(() => ({ tabBarHidden, setTabBarHidden }), [tabBarHidden]);
  return <MobileChromeContext.Provider value={value}>{children}</MobileChromeContext.Provider>;
}

/**
 * Trang có thanh thao tác riêng ở đáy (ví dụ chi tiết sự cố) gọi hook này
 * để ẩn thanh tab, tránh hai thanh chồng nhau. Rời trang là thanh tab hiện lại.
 */
export function useHideMobileTabBar(hidden: boolean) {
  const setTabBarHidden = useContext(MobileChromeContext)?.setTabBarHidden;
  useEffect(() => {
    if (!setTabBarHidden) return;
    setTabBarHidden(hidden);
    return () => setTabBarHidden(false);
  }, [hidden, setTabBarHidden]);
}

export function useIsMobileTabBarHidden(): boolean {
  return useContext(MobileChromeContext)?.tabBarHidden ?? false;
}
