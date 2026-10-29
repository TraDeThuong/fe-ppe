import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import UsersContent from "./users-content";

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}
