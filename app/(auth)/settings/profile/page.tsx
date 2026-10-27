import { Suspense } from "react";

import { ProfileSettingsContent } from "@/components/features/auth/settings/profile-settings-content";

/**
 * Page là server component + Suspense: RSC payload luôn có fallback shell
 * (điều kiện để qua instant-navigation validation của Next 16 cacheComponents).
 * Nội dung client nằm ở profile-settings-content.tsx.
 */
export default function ProfileSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-background text-muted-foreground">
          <p>Đang tải...</p>
        </div>
      }
    >
      <ProfileSettingsContent />
    </Suspense>
  );
}
