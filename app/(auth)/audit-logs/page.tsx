import { Suspense } from "react";
import AuditLogsContent from "./audit-logs-content";

export default function AuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải nhật ký kiểm toán hệ thống...</p>
        </div>
      }
    >
      <AuditLogsContent />
    </Suspense>
  );
}
