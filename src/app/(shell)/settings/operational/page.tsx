import { OperationalSettingsForm } from "@/features/settings/components/operational-settings-form";
import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { requirePanelRoute } from "@/lib/server/panel-access";

export default async function OperationalSettingsPage() {
  const { currentUser } = await requirePanelRoute("/settings/operational");

  return (
    <ProtectedAreaPage routeKey="settings-operational" sessionUser={currentUser}>
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Governação Operacional</h2>
        <p className="text-sm text-muted-foreground">
          Configure os parâmetros nucleares da operação, incluindo janelas de atendimento, 
          antecedência mínima e notificações.
        </p>
        <div className="mt-6">
          <OperationalSettingsForm />
        </div>
      </div>
    </ProtectedAreaPage>
  );
}
