import * as React from "react";
import type { ReactNode } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  getPanelPrimaryActionState,
  getPanelRouteDefinition,
  getPanelRoleRuntime,
  type PanelRouteKey,
} from "@/lib/auth/authorization";
import type { PanelSessionUser } from "@/lib/auth/session";

const areaHighlights: Record<PanelRouteKey, readonly string[]> = {
  dashboard: [
    "Resumo de capacidade e carga operacional",
    "Atalhos para áreas protegidas do painel",
    "Entrada segura para fluxos administrativos",
  ],
  orders: [
    "Fila operacional de encomendas",
    "Pesquisa e abertura de detalhe",
    "Ações alinhadas com permissões do perfil",
  ],
  planning: [
    "Visão diária e semanal de slots",
    "Carga prevista por período",
    "Governança operacional de planeamento",
  ],
  "settings-operational": [
    "Parâmetros globais de agendamento e cancelamento",
    "Validação de notificações WhatsApp",
    "Controlo de concorrência para alterações críticas",
  ],
  "settings-access": [
    "Perfis de staff e gestão de acessos",
    "Configuração administrativa crítica",
    "Área reservada para governança",
  ],
  "audit-investigation": [
    "Consulta de trilho de auditoria",
    "Investigação de divergências operacionais",
    "Suporte a troubleshooting e revalidação",
  ],
};

export function ProtectedAreaPage({
  children,
  routeKey,
  sessionUser,
}: Readonly<{
  children?: ReactNode;
  routeKey: PanelRouteKey;
  sessionUser: PanelSessionUser;
}>) {
  const route = getPanelRouteDefinition(
    {
      dashboard: "/dashboard",
      orders: "/orders",
      planning: "/planning",
      "settings-operational": "/settings/operational",
      "settings-access": "/settings/access",
      "audit-investigation": "/audit/investigation",
    }[routeKey],
  );
  const primaryAction = getPanelPrimaryActionState(sessionUser.role, routeKey);
  const roleRuntime = getPanelRoleRuntime(sessionUser.role);

  if (!route) {
    return null;
  }

  if (routeKey === "dashboard") {
    return (
      <section className="space-y-6">
        <header className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Painel operacional
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Dashboard de encomendas
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Use esta área para acompanhar o dia operacional, encontrar
              rapidamente encomendas em andamento e avançar para criação,
              atendimento e planeamento sem depender de conteúdo técnico.
            </p>
          </div>
        </header>

        {children}
      </section>
    );
  }

  if (routeKey === "orders") {
    return <section className="space-y-6">{children}</section>;
  }

  if (routeKey === "planning") {
    return (
      <section className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
              Planeamento
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Carga operacional, slots e leitura de capacidade
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Consulte o volume por dia, semana ou período, acompanhe a
              ocupação oficial por slot e use as regras operacionais para
              apoiar a criação de novas encomendas sem perder o contexto do dia.
            </p>
          </div>
        </header>

        {children}
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
          {route.label}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {route.description}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Esta área já está protegida pelo mesmo modelo central de permissões da
          shell. Hoje o runtime live continua limitado a administradores, mas o
          modelo já descreve o comportamento esperado para perfis operacionais
          futuros sem promover acessos inexistentes no backend.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="grid gap-4 md:grid-cols-2">
          {areaHighlights[routeKey].map((item) => (
            <article
              key={item}
              className="rounded-2xl border border-border/70 bg-card/80 p-5"
            >
              <p className="text-sm font-medium text-card-foreground">{item}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Estrutura reservada para próximas stories, mantendo a navegação,
                o boundary protegido e a política de capacidades já alinhados.
              </p>
            </article>
          ))}
        </div>

        <aside className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">Estado de autorização</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Perfil actual: <strong>{sessionUser.role}</strong>. Runtime:{" "}
              <strong>{roleRuntime ?? "desconhecido"}</strong>.
            </p>
          </div>

          {primaryAction ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Ação primária</p>
              <Button disabled={!primaryAction.enabled}>
                {primaryAction.enabled
                  ? "Ação disponível para este perfil"
                  : "Ação fora do âmbito deste perfil"}
              </Button>
              <p className="text-sm leading-6 text-muted-foreground">
                A affordance segue a capability centralizada{" "}
                <code>{primaryAction.capability}</code>. A autorização final
                continua dependente do backend.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium">Continuação segura</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button variant="outline">Voltar ao dashboard</Button>
              </Link>
              <Link href="/signin">
                <Button variant="ghost">Ir para autenticação</Button>
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {children}
    </section>
  );
}
