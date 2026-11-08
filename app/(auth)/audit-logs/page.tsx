import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import AuditLogsContent from "./audit-logs-content";

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <AuditLogsContent />
    </Suspense>
  );
}
