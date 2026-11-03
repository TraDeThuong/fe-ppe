import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import MaintenanceContent from "./maintenance-content";

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <MaintenanceContent />
    </Suspense>
  );
}
