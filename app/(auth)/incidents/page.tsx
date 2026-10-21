import { Suspense } from "react";
import IncidentsContent from "./incidents-content";

export default function IncidentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải danh sách sự cố...</p>
        </div>
      }
    >
      <IncidentsContent />
    </Suspense>
  );
}
