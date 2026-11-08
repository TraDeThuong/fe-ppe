import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import ReportsContent from "./reports-content";

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <ReportsContent />
    </Suspense>
  );
}
