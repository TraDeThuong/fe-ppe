"use client";

import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, UserRound } from "lucide-react";

import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import { useLocale } from "@/providers/locale-provider";

export interface SettingsTabNavProps {
  className?: string;
}

export function SettingsTabNav({ className = "" }: SettingsTabNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();

  const activeValue = pathname.startsWith("/settings/profile")
    ? "/settings/profile"
    : "/settings/security";

  const options: SegmentedControlOption[] = [
    {
      value: "/settings/profile",
      label: t("profile.tab.profile"),
      icon: <UserRound className="size-4" />,
    },
    {
      value: "/settings/security",
      label: t("profile.tab.security"),
      icon: <ShieldCheck className="size-4" />,
    },
  ];

  return (
    <div className={`w-full ${className}`}>
      <SegmentedControl
        aria-label={t("nav.settings") || "Cài đặt tài khoản"}
        value={activeValue}
        onValueChange={(nextRoute) => {
          if (nextRoute !== pathname) {
            router.push(nextRoute);
          }
        }}
        options={options}
        fullWidth
        size="md"
      />
    </div>
  );
}
