import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import AiModelTestContent from "./ai-model-test-content";

export default function AiModelTestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <AiModelTestContent />
    </Suspense>
  );
}

