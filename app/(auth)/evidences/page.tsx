import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import EvidencesContent from "./evidences-content";

export default function EvidencesPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <EvidencesContent />
    </Suspense>
  );
}

