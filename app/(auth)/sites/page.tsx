import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import SitesContent from "./sites-content";

export default function SitesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <SitesContent />
    </Suspense>
  );
}
