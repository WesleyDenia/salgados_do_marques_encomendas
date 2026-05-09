import type { Metadata } from "next";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { requirePanelRoute } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Auditoria e investigação",
};

export default async function AuditInvestigationPage() {
  const { currentUser } = await requirePanelRoute("/audit/investigation");

  return (
    <ProtectedAreaPage
      routeKey="audit-investigation"
      sessionUser={currentUser}
    />
  );
}
