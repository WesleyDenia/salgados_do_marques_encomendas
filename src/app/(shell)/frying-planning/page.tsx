import type { Metadata } from "next";
import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { FryingPlanningBoard } from "@/features/frying/components/frying-planning-board";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = { title: "Planeamento de fritura" };

export default async function FryingPlanningPage() {
  const { currentUser } = await requirePanelRoute("/frying-planning");
  return <ProtectedAreaPage routeKey="frying-planning" sessionUser={currentUser}><FryingPlanningBoard /></ProtectedAreaPage>;
}
