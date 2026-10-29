import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import CamerasContent from "./cameras-content";

export default function CamerasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <CamerasContent />
    </Suspense>
  );
}
