import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import AiMetricsContent from "./ai-metrics-content";

export default function AiMetricsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <AiMetricsContent />
    </Suspense>
  );
}
