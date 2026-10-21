import { Suspense } from "react";
import CamerasContent from "./cameras-content";

export default function CamerasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải danh sách camera...</p>
        </div>
      }
    >
      <CamerasContent />
    </Suspense>
  );
}
