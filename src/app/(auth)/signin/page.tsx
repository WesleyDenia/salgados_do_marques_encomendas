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
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Painel Operacional
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Acessar Painel
        </p>
      </div>

      <LoginForm disabled={!panelSessionConfigured} />
    </section>
  );
}
