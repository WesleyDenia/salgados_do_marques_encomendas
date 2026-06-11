import * as React from "react";
import type { ReactNode } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  PANEL_ROUTE_DEFINITIONS,
  getPanelCapabilities,
  getPanelRoleLabel,
  getPanelPrimaryActionState,
  getPanelRouteDefinition,
  getPanelRoleRuntime,
  hasPanelCapability,
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
    const visibleRoutes = PANEL_ROUTE_DEFINITIONS.filter((item) =>
      hasPanelCapability(sessionUser.role, item.requiredCapability),
    );
    const hiddenRoutes = PANEL_ROUTE_DEFINITIONS.filter(
      (item) => !hasPanelCapability(sessionUser.role, item.requiredCapability),
    );
    const capabilities = getPanelCapabilities(sessionUser.role);
    const primaryDestinations = visibleRoutes.filter((item) => item.key !== "dashboard");

    return (
      <section className="space-y-8">
        <header className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Painel operacional
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Visão geral da operação e acessos disponíveis
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              A partir daqui pode entrar rapidamente nas áreas ativas para o seu
              perfil, confirmar o âmbito das permissões carregadas e retomar a
              operação sem depender de conteúdo provisório.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-border/70 bg-card/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Perfil autenticado
              </p>
              <p className="mt-3 text-lg font-semibold text-card-foreground">
                {sessionUser.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {getPanelRoleLabel(sessionUser.role)} · {sessionUser.email}
              </p>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Áreas acessíveis agora
              </p>
              <p className="mt-3 text-3xl font-semibold text-card-foreground">
                {visibleRoutes.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {primaryDestinations.length > 0
                  ? `${primaryDestinations.length} fluxos operacionais prontos a abrir`
                  : "Sem fluxos adicionais disponíveis neste perfil"}
              </p>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Capacidades carregadas
              </p>
              <p className="mt-3 text-3xl font-semibold text-card-foreground">
                {capabilities.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Runtime {roleRuntime ?? "desconhecido"} com política centralizada ativa
              </p>
            </article>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card/90 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    Destinos principais
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Áreas que o perfil atual pode abrir de imediato.
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {visibleRoutes.length} acessos ativos
                </p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {visibleRoutes.map((item) => {
                  const actionState = getPanelPrimaryActionState(
                    sessionUser.role,
                    item.key,
                  );

                  return (
                    <article
                      key={item.key}
                      className="rounded-2xl border border-border/70 bg-background/80 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">
                            {item.label}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <span className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {item.runtime}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <p>
                          Capacidade de entrada: <code>{item.requiredCapability}</code>
                        </p>
                        {actionState ? (
                          <p>
                            Ação primária: <code>{actionState.capability}</code>
                          </p>
                        ) : (
                          <p>Área de consulta e navegação sem ação primária dedicada.</p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link href={item.href}>
                          <Button>
                            {item.key === "dashboard"
                              ? "Atualizar visão geral"
                              : `Abrir ${item.label}`}
                          </Button>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
              <p className="text-sm font-medium text-card-foreground">
                Resumo de acesso
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  Perfil atual: <strong>{sessionUser.role}</strong>. Runtime:{" "}
                  <strong>{roleRuntime ?? "desconhecido"}</strong>.
                </p>
                <p>
                  Utilizador autenticado com estado{" "}
                  <strong>{sessionUser.active ? "ativo" : "inativo"}</strong>.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
              <p className="text-sm font-medium text-card-foreground">
                Áreas fora do âmbito deste perfil
              </p>
              <div className="mt-4 space-y-3">
                {hiddenRoutes.length === 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Este perfil já vê todas as áreas definidas atualmente no painel.
                  </p>
                ) : (
                  hiddenRoutes.map((item) => (
                    <article
                      key={item.key}
                      className="rounded-xl border border-dashed border-border/80 bg-background/70 p-4"
                    >
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Requer <code>{item.requiredCapability}</code>
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>

        {children}
      </section>
    );
  }

  if (routeKey === "orders") {
    const capabilities = getPanelCapabilities(sessionUser.role);
    const canCreateOrders = capabilities.includes("orders:create");
    const canManageOrders = capabilities.includes("orders:manage");

    return (
      <section className="space-y-8">
        <header className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Encomendas
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Fila operacional e detalhe acionável de encomendas
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Use esta área para localizar rapidamente a encomenda certa,
              validar o estado atual antes de agir e abrir o detalhe completo
              com o mesmo contexto operacional usado no resto do painel.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-border/70 bg-card/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Perfil em operação
              </p>
              <p className="mt-3 text-lg font-semibold text-card-foreground">
                {getPanelRoleLabel(sessionUser.role)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Runtime {roleRuntime ?? "desconhecido"} · {sessionUser.name}
              </p>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Criação de encomendas
              </p>
              <p className="mt-3 text-lg font-semibold text-card-foreground">
                {canCreateOrders ? "Disponível" : "Indisponível"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {canCreateOrders
                  ? "O perfil atual pode abrir fluxos de registo."
                  : "O perfil atual não expõe criação direta nesta área."}
              </p>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Correção e gestão
              </p>
              <p className="mt-3 text-lg font-semibold text-card-foreground">
                {canManageOrders ? "Permitida" : "Consulta apenas"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {canManageOrders
                  ? "Pode atualizar estado e corrigir dados quando a encomenda o permitir."
                  : "Pode consultar a fila, mas sem ações operacionais avançadas."}
              </p>
            </article>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
              <p className="text-sm font-medium text-card-foreground">
                Sequência de trabalho nesta área
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    1. Localizar
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    Pesquise por número, cliente, contacto, estado, pagamento e
                    slot para chegar à fila certa.
                  </p>
                </article>
                <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    2. Validar
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    Confirme o registo atual, o histórico relevante e o
                    enquadramento operacional antes de qualquer alteração.
                  </p>
                </article>
                <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    3. Agir
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    Aplique apenas as ações que o perfil suporta e que a
                    encomenda ainda permite no backend.
                  </p>
                </article>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
              <p className="text-sm font-medium text-card-foreground">
                Capacidades ativas para encomendas
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  Entrada na fila: <code>orders:view</code>
                </p>
                <p>
                  Registo de novas encomendas:{" "}
                  <code>{canCreateOrders ? "orders:create" : "não disponível"}</code>
                </p>
                <p>
                  Gestão operacional:{" "}
                  <code>{canManageOrders ? "orders:manage" : "não disponível"}</code>
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
              <p className="text-sm font-medium text-card-foreground">
                Contexto desta página
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  O detalhe apresentado abaixo já é a área principal de trabalho
                  para triagem, correção e reimpressão operacional.
                </p>
                <p>
                  O cabeçalho desta página foi reduzido ao contexto útil, sem
                  blocos de placeholder nem promessas de funcionalidades futuras.
                </p>
              </div>
            </section>
          </aside>
        </div>

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
