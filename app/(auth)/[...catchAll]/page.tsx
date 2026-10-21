import { Suspense } from "react";
import CatchAllContent from "./catch-all-content";

export function generateStaticParams() {
  return [
    { catchAll: ["not-found-placeholder"] },
  ];
}

export default function CatchAllPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          <p>Đang tải...</p>
        </div>
      }
    >
      <CatchAllContent />
    </Suspense>
  );
}
