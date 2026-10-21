import { Suspense } from "react";
import ReportsContent from "./reports-content";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải trung tâm báo cáo & thống kê...</p>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
