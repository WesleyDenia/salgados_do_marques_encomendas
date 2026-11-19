import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { CustomersOperationalRecord } from "@/features/customers/components/customers-operational-record";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Clientes",
};

export default async function CustomersPage() {
  const { currentUser } = await requirePanelRoute("/customers");

  return (
    <ProtectedAreaPage routeKey="customers" sessionUser={currentUser}>
      <CustomersOperationalRecord />
    </ProtectedAreaPage>
  );
}
