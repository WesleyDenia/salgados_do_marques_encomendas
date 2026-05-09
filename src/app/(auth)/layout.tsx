import type { ReactNode } from "react";

import { AuthLayout } from "@/components/layout/auth-layout";

export default function AuthRouteGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <AuthLayout>{children}</AuthLayout>;
}
