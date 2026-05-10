import { AccessProfileTable } from "@/features/settings/components/access-profile-table";
import { ProtectedAreaPage } from "@/components/layout/protected-area-page";
import { requirePanelRoute } from "@/lib/server/panel-access";

export default async function AccessSettingsPage() {
  const { currentUser } = await requirePanelRoute("/settings/access");

  return (
    <ProtectedAreaPage routeKey="settings-access" sessionUser={currentUser}>
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Gestão de Perfis</h2>
        <p className="text-sm text-muted-foreground">
          Consulte e atualize os perfis de acesso dos utilizadores do staff. 
          As alterações são aplicadas imediatamente no backend.
        </p>
        <AccessProfileTable />
      </div>
    </ProtectedAreaPage>
  );
}
