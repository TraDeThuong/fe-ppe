import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import { ScheduledTasksScreen } from "@/components/features/scheduled-tasks/scheduled-tasks-screen";

export default function ScheduledTasksPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <ScheduledTasksScreen />
    </Suspense>
  );
}
