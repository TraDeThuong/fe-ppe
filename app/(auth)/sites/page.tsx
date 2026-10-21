import { Suspense } from "react";
import SitesContent from "./sites-content";

export default function SitesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải danh sách công trường & phân khu...</p>
        </div>
      }
    >
      <SitesContent />
    </Suspense>
  );
}
