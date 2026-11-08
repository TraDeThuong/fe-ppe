import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import { ScheduledTasksScreen } from "@/components/features/scheduled-tasks/scheduled-tasks-screen";

export default function ScheduledTasksPage() {
  return <Suspense fallback={<div className="flex min-h-80 items-center justify-center"><Loader showLabel /></div>}>
    <ScheduledTasksScreen />
  </Suspense>;
}
