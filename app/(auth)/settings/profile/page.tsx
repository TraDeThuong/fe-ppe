import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";

import { ProfileSettingsContent } from "@/components/features/auth/settings/profile-settings-content";

/**
 * Page là server component + Suspense: RSC payload luôn có fallback shell
 * (điều kiện để qua instant-navigation validation của Next 16 cacheComponents).
 * Nội dung client nằm ở profile-settings-content.tsx.
 */
export default function ProfileSettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="simple" />}>
      <ProfileSettingsContent />
    </Suspense>
  );
}
