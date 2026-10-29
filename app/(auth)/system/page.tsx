import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import SystemContent from "./system-content";

export default function SystemPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <SystemContent />
    </Suspense>
  );
}
