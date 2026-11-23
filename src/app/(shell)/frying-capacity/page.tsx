import type { Metadata } from "next";
import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { PreparationCapacityManager } from "@/features/frying/components/preparation-capacity-manager";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = { title: "Cubas e fritura" };

export default async function FryingCapacityPage() {
  const { currentUser } = await requirePanelRoute("/frying-capacity");
  return <ProtectedAreaPage routeKey="frying-capacity" sessionUser={currentUser}><PreparationCapacityManager /></ProtectedAreaPage>;
}
