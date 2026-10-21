import { Suspense } from "react";
import NotificationsContent from "./notifications-content";

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải trung tâm thông báo...</p>
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}
