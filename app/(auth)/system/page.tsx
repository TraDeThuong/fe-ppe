import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import SystemContent from "./system-content";

export default function SystemPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <SystemContent />
    </Suspense>
  );
}
