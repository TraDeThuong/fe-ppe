import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import IncidentsContent from "./incidents-content";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <IncidentsContent />
    </Suspense>
  );
}
