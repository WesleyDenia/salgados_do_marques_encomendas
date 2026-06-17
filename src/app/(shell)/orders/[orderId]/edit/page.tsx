import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { OrderComposerPage } from "@/features/orders/components/order-composer-page";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Corrigir encomenda",
};

export default async function EditOrderPage({
  params,
}: Readonly<{
  params: Promise<{ orderId: string }>;
}>) {
  const { currentUser } = await requirePanelRoute("/orders");
  const { orderId } = await params;

  return (
    <ProtectedAreaPage routeKey="orders" sessionUser={currentUser}>
      <OrderComposerPage mode="edit" orderId={orderId} />
    </ProtectedAreaPage>
  );
}
