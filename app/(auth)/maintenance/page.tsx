import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import MaintenanceContent from "./maintenance-content";

export default function MaintenancePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <MaintenanceContent />
    </Suspense>
  );
}
