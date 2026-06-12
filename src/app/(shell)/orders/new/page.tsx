import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { OrderComposerPage } from "@/features/orders/components/order-composer-page";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Nova encomenda",
};

export default async function NewOrderPage() {
  const { currentUser } = await requirePanelRoute("/orders");

  return (
    <ProtectedAreaPage routeKey="orders" sessionUser={currentUser}>
      <OrderComposerPage />
    </ProtectedAreaPage>
  );
}
