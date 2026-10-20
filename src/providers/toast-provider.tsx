"use client";

import { ToasterProvider as DesignSystemToaster } from "@ui/toaster";

/** Thin wrapper — toàn bộ cấu hình toast nằm ở design system (@ui/toaster) */
export function ToastProvider() {
  return <DesignSystemToaster />;
}
