import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import IncidentAssignmentsContent from "./incident-assignments-content";

export default function IncidentAssignmentsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <IncidentAssignmentsContent />
    </Suspense>
  );
}

