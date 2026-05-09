import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Encomendas",
};

export default async function OrdersPage() {
  const { currentUser } = await requirePanelRoute("/orders");

  return <ProtectedAreaPage routeKey="orders" sessionUser={currentUser} />;
}
