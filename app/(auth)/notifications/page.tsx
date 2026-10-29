import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import NotificationsContent from "./notifications-content";

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}
