"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { Button } from "@ui/button";

export function ForbiddenView() {
  const { t } = useLocale();

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-nm">
        <ShieldX className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">
          {t("guard.forbiddenTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("guard.forbiddenBody")}
        </p>
        <Link href="/dashboard">
          <Button className="mt-6">{t("guard.backToDashboard")}</Button>
        </Link>
      </div>
    </div>
  );
}
