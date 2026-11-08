import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import SitesContent from "./sites-content";

export default function SitesPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <SitesContent />
    </Suspense>
  );
}
