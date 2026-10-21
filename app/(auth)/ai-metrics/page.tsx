import { Suspense } from "react";
import AiMetricsContent from "./ai-metrics-content";

export default function AiMetricsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải hiệu năng mô hình AI...</p>
        </div>
      }
    >
      <AiMetricsContent />
    </Suspense>
  );
}
