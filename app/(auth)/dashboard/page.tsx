import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import DashboardContent from "./dashboard-content";

/**
 * Page là server component + Suspense: RSC payload luôn có fallback shell
 * (điều kiện để qua instant-navigation validation của Next 16 cacheComponents).
 * Nội dung client nằm ở dashboard-content.tsx.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <DashboardContent />
    </Suspense>
  );
}
