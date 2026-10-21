import { Suspense } from "react";

import { SecuritySettingsContent } from "@/components/features/auth/settings/security-settings-content";

/**
 * Page là server component + Suspense: RSC payload luôn có fallback shell
 * (điều kiện để qua instant-navigation validation của Next 16 cacheComponents).
 * Nội dung client nằm ở security-settings-content.tsx.
 */
export default function SecuritySettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          <p>Đang tải...</p>
        </div>
      }
    >
      <SecuritySettingsContent />
    </Suspense>
  );
}
