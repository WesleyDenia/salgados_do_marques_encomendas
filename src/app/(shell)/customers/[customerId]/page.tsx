import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { CustomerDetailRecord } from "@/features/customers/components/customer-detail-record";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Cliente",
};

export default async function CustomerDetailPage({
  params,
}: Readonly<{
  params: Promise<{ customerId: string }>;
}>) {
  const { currentUser } = await requirePanelRoute("/customers");
  const { customerId } = await params;

  return (
    <ProtectedAreaPage routeKey="customers" sessionUser={currentUser}>
      <CustomerDetailRecord customerId={customerId} />
    </ProtectedAreaPage>
  );
}
