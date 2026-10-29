import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
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
          <Loader showLabel />
        </div>
      }
    >
      <CatchAllContent />
    </Suspense>
  );
}
