import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Definições e acessos",
};

export default async function SettingsAccessPage() {
  const { currentUser } = await requirePanelRoute("/settings/access");

  return (
    <ProtectedAreaPage routeKey="settings-access" sessionUser={currentUser} />
  );
}
