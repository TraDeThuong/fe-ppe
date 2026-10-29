import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import RolesContent from "./roles-content";

export default function RolesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <RolesContent />
    </Suspense>
  );
}
