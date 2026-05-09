import type { ReactNode } from "react";

import { AppShellLayout } from "@/components/layout/app-shell-layout";
import { requirePanelRoute } from "@/lib/server/panel-access";

export default async function ShellRouteGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { currentUser } = await requirePanelRoute("/dashboard");

  return <AppShellLayout sessionUser={currentUser}>{children}</AppShellLayout>;
}
