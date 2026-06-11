import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { PlanningPeriodView } from "@/features/planning/components/planning-period-view";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Planeamento",
};

export default async function PlanningPage() {
  const { currentUser } = await requirePanelRoute("/planning");

  return (
    <ProtectedAreaPage routeKey="planning" sessionUser={currentUser}>
      <PlanningPeriodView role={currentUser.role} />
    </ProtectedAreaPage>
  );
}
