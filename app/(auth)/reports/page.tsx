import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import ReportsContent from "./reports-content";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
