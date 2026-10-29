import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import IncidentsContent from "./incidents-content";

export default function IncidentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <IncidentsContent />
    </Suspense>
  );
}
