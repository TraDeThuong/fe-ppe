import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import NotificationsContent from "./notifications-content";

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <NotificationsContent />
    </Suspense>
  );
}
