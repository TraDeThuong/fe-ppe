import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import RolesContent from "./roles-content";

export default function RolesPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <RolesContent />
    </Suspense>
  );
}
