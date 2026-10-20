import Link from "next/link";
import type { ReactNode } from "react";

export interface AuthFooterLinkProps {
  href: string;
  children: ReactNode;
}

/** Link phụ dưới chân AuthShell (quên mật khẩu, đăng ký...) */
export function AuthFooterLink({ href, children }: AuthFooterLinkProps) {
  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      {children}
    </Link>
  );
}
