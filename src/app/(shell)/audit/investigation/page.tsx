import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { OrdersOperationalRecord } from "@/features/orders/components/orders-operational-record";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Auditoria e investigação",
};

export default async function AuditInvestigationPage() {
  const { currentUser } = await requirePanelRoute("/audit/investigation");

  return (
    <ProtectedAreaPage routeKey="audit-investigation" sessionUser={currentUser}>
      <OrdersOperationalRecord mode="investigation" />
    </ProtectedAreaPage>
  );
}
