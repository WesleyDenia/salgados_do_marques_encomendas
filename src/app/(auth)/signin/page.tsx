import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { authorizePanelRoute } from "@/lib/auth/authorization";
import {
  isPanelSessionConfigured,
} from "@/lib/auth/session";
import { getCurrentPanelRequestState } from "@/lib/server/panel-access";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function SignInPage() {
  const { currentUser } = await getCurrentPanelRequestState();

  if (currentUser) {
    const access = authorizePanelRoute(currentUser, "/dashboard");

    redirect(access.allowed ? "/dashboard" : access.redirectTo);
  }

  const panelSessionConfigured = isPanelSessionConfigured();

  return (
    <section className="w-full max-w-md space-y-6 rounded-3xl border border-border/70 bg-card/90 p-8 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Salgados
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Entrar no painel operacional
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Autentique-se com uma conta autorizada da equipa. O painel mantém a
          sessão no lado servidor e usa a boundary same-origin em{" "}
          <code>/api/v1</code> para falar com o <code>salgados-api</code>{" "}
          sem expor o token Sanctum ao browser.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">Preparado nesta story</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Login através do backend existente com sessão HttpOnly assinada</li>
          <li>Preservação de sessão no shell protegido entre refresh e navegação</li>
          <li>Refresh de token no servidor durante pedidos autenticados</li>
          <li>Permissões centralizadas por rota e capability do painel</li>
        </ul>
      </div>

      {!panelSessionConfigured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Configure <code>SESSION_SECRET</code> no ambiente antes de usar a
          autenticação do painel.
        </div>
      ) : null}

      <LoginForm disabled={!panelSessionConfigured} />
    </section>
  );
}
