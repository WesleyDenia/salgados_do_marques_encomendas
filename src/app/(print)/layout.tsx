import type { ReactNode } from "react";

import { requirePanelRoute } from "@/lib/server/panel-access";

export default async function PrintRouteGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requirePanelRoute("/orders");

  return children;
}
