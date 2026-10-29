import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import AuditLogsContent from "./audit-logs-content";

export default function AuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <AuditLogsContent />
    </Suspense>
  );
}
