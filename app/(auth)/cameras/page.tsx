import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import CamerasContent from "./cameras-content";

export default function CamerasPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <CamerasContent />
    </Suspense>
  );
}
