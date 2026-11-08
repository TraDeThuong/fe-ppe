import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import UsersContent from "./users-content";

export default function UsersPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <UsersContent />
    </Suspense>
  );
}
