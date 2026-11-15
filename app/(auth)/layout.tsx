import { AuthLayoutClient } from "@/components/features/app-shell/auth-layout-client";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
