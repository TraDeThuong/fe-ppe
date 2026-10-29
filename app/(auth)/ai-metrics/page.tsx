import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import AiMetricsContent from "./ai-metrics-content";

export default function AiMetricsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <AiMetricsContent />
    </Suspense>
  );
}
