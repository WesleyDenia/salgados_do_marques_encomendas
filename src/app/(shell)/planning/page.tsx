import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { PlanningDailyView } from "@/features/planning/components/planning-daily-view";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Planeamento",
};

export default async function PlanningPage() {
  const { currentUser } = await requirePanelRoute("/planning");

  return (
    <ProtectedAreaPage routeKey="planning" sessionUser={currentUser}>
      <PlanningDailyView />
    </ProtectedAreaPage>
  );
}
