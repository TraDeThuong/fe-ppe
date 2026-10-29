import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import DashboardContent from "./dashboard-content";

/**
 * Page là server component + Suspense: RSC payload luôn có fallback shell
 * (điều kiện để qua instant-navigation validation của Next 16 cacheComponents).
 * Nội dung client nằm ở dashboard-content.tsx.
 */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
