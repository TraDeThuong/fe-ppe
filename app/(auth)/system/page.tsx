import { Suspense } from "react";
import SystemContent from "./system-content";

export default function SystemPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải cấu hình hệ thống...</p>
        </div>
      }
    >
      <SystemContent />
    </Suspense>
  );
}
