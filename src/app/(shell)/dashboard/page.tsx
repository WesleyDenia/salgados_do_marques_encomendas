import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { OperationalDashboard } from "@/features/dashboard/components/operational-dashboard";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { currentUser } = await requirePanelRoute("/dashboard");

  return (
    <ProtectedAreaPage routeKey="dashboard" sessionUser={currentUser}>
      <OperationalDashboard role={currentUser.role} />
    </ProtectedAreaPage>
  );
}
