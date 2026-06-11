"use client";

import * as React from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrderSettings } from "@/features/orders/hooks/use-order-queries";
import { formatOperationalDateTime } from "@/features/orders/utils/operational-timezone";
import { PlanningSlotLoadSummary } from "@/features/planning/components/planning-slot-load-summary";
import { PlanningSlotOccupancySummary } from "@/features/planning/components/planning-slot-occupancy-summary";
import { usePeriodPlanning } from "@/features/planning/hooks/use-period-planning";
import type {
  PeriodPlanningResponse,
  PlanningPeriodStatus,
} from "@/features/planning/types";
import {
  buildPlanningCustomerLabel,
  buildPlanningLoadLabel,
  buildPlanningPaymentLabel,
  buildPlanningPeriodDateRange,
  buildPlanningOfficialDayGroups,
  buildPlanningPeriodOrderGroups,
  buildPlanningSlotLabel,
} from "@/features/planning/utils";

function buildSummaryCards(data: PeriodPlanningResponse) {
  if (!data.summary) {
    return [];
  }

  return [
    {
      label: "Encomendas do período",
      value: String(data.summary.orderCount),
      description: `Conjunto completo de ${data.selectedPeriodLabel}.`,
    },
    {
      label: "Carga total",
      value: `${data.summary.itemQuantity} itens`,
      description: "Quantidade total de itens para leitura operacional do período.",
    },
    {
      label: "Pagas",
      value: String(data.summary.paidCount),
      description: "Encomendas já liquidadas no conjunto do período.",
    },
    {
      label: "A pedir atenção",
      value: String(data.summary.attentionCount),
      description: "Estados colocados ou aceites a acompanhar no período.",
    },
  ];
}

export function PlanningCustomPeriodBoard({
  data,
  timeZone,
  startDate,
  endDate,
  statusLabels,
}: Readonly<{
  data: PeriodPlanningResponse;
  timeZone: string;
  startDate: string;
  endDate: string;
  statusLabels?: Record<string, string>;
}>) {
  const summaryCards = buildSummaryCards(data);
  const periodRange = buildPlanningPeriodDateRange(startDate, endDate, timeZone);
  const officialDayGroups = buildPlanningOfficialDayGroups(data.daySummaries);
  const detailDayGroups = buildPlanningPeriodOrderGroups(data, timeZone);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Módulo /planning
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Planeamento por período personalizado
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Esta vista permite analisar intervalos operacionais arbitrários sem
          deslocar a lógica temporal oficial para o frontend.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Período operacional consultado: <strong>{data.selectedPeriodLabel}</strong>{" "}
          ({startDate} até {endDate} · limites {periodRange.scheduledFrom} até{" "}
          {periodRange.scheduledTo}).
        </p>
      </div>

      {summaryCards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-border/70 bg-card/90 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-5 text-sm text-muted-foreground">
          O backend não devolveu um resumo oficial do período. A leitura abaixo usa
          o dataset oficial das encomendas e os agregados diários disponíveis.
        </div>
      )}

      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <PlanningSlotLoadSummary
          title="Carga agregada por slot"
          description="O período usa o agregado oficial do intervalo e distribuições diárias oficiais, sem recalcular concentração a partir das linhas detalhadas."
          slotLabels={data.slotLabels}
          groups={[
            {
              id: "period-total",
              label: "Total do período",
              slotCounts: data.summary?.slotCounts ?? {},
            },
          ]}
        />
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <PlanningSlotOccupancySummary
          title="Ocupação oficial por slot"
          description="O total do período mantém a contagem oficial, mas só afirma disponibilidade quando o backend consegue provar esse estado sem ambiguidade."
          slotLabels={data.slotLabels}
          groups={[
            {
              id: "period-occupancy-total",
              label: "Total do período",
              slotOccupancy: data.slotOccupancy,
            },
          ]}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">
            Distribuição e ocupação oficial por dia
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Cada cartão representa um dia civil do intervalo inclusivo devolvido pelo backend,
            incluindo o estado textual de slot quando esse contexto é oficialmente determinável.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {officialDayGroups.map(({ dayKey, summary }) => (
            <article
              key={dayKey}
              className="rounded-2xl border border-border/70 bg-background/80 p-4"
            >
              <p className="text-sm font-semibold text-foreground">{summary.label}</p>
              <dl className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <dt>Encomendas</dt>
                  <dd>{summary.orderCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>Carga</dt>
                  <dd>{summary.itemQuantity} itens</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>Pagas</dt>
                  <dd>{summary.paidCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>Atenção</dt>
                  <dd>{summary.attentionCount}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <PlanningSlotLoadSummary
                  compact
                  hideGroupLabels
                  slotLabels={data.slotLabels}
                  groups={[
                    {
                      id: `period-day-${dayKey}`,
                      label: summary.label,
                      slotCounts: summary.slotCounts,
                    },
                  ]}
                />
                <div className="mt-3">
                  <PlanningSlotOccupancySummary
                    compact
                    hideGroupLabels
                    slotLabels={data.slotLabels}
                    groups={[
                      {
                        id: `period-day-occupancy-${dayKey}`,
                        label: summary.label,
                        slotOccupancy: summary.slotOccupancy,
                      },
                    ]}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {data.orders.length === 0 ? (
        <EmptyState
          title="Sem encomendas para este período operacional"
          description={`Não existem encomendas registadas para ${data.selectedPeriodLabel}. Ajuste o intervalo para continuar a leitura operacional.`}
        />
      ) : (
        <section className="space-y-6">
          {detailDayGroups.map(({ dayKey, summary, orders }) => (
            <section key={dayKey} className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">{summary.label}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {orders.length > 0
                    ? "Leitura operacional do dia dentro do período selecionado."
                    : "Dia incluído no intervalo oficial, sem encomendas detalhadas no dataset atual."}
                </p>
              </div>

              {orders.length === 0 ? (
                <EmptyState
                  title="Sem encomendas neste dia"
                  description="O agregado oficial existe para manter a continuidade temporal do período."
                />
              ) : (
                <>
                  <div className="hidden overflow-x-auto rounded-2xl border border-border/70 bg-card/90 md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hora</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Loja</TableHead>
                          <TableHead>Slot</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Carga</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              {formatOperationalDateTime(order.scheduledAt, timeZone)}
                            </TableCell>
                            <TableCell>{buildPlanningCustomerLabel(order)}</TableCell>
                            <TableCell>{order.store?.name ?? "Loja não carregada"}</TableCell>
                            <TableCell>{buildPlanningSlotLabel(order)}</TableCell>
                            <TableCell>
                              {statusLabels?.[order.status] ?? order.status}
                            </TableCell>
                            <TableCell>{buildPlanningPaymentLabel(order)}</TableCell>
                            <TableCell>{buildPlanningLoadLabel(order)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-4 md:hidden">
                    {orders.map((order) => (
                      <article
                        key={`period-mobile-${dayKey}-${order.id}`}
                        className="rounded-2xl border border-border/70 bg-card/90 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {buildPlanningCustomerLabel(order)}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatOperationalDateTime(order.scheduledAt, timeZone)}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {buildPlanningSlotLabel(order)}
                          </span>
                        </div>
                        <dl className="mt-4 grid gap-2 text-sm text-muted-foreground">
                          <div>
                            <dt className="font-medium text-foreground">Loja</dt>
                            <dd>{order.store?.name ?? "Loja não carregada"}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">Estado</dt>
                            <dd>{statusLabels?.[order.status] ?? order.status}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">Pagamento</dt>
                            <dd>{buildPlanningPaymentLabel(order)}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">Carga</dt>
                            <dd>{buildPlanningLoadLabel(order)}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          ))}
        </section>
      )}
    </section>
  );
}

function buildPeriodStatusLabel(periodStatus: PlanningPeriodStatus, startDate: string, endDate: string) {
  if (periodStatus === "incomplete") {
    return "Defina data inicial e final para consultar o período.";
  }

  if (periodStatus === "invalid") {
    return "O intervalo é inválido: a data final tem de ser igual ou posterior à inicial.";
  }

  return startDate && endDate
    ? "Dados sincronizados com a boundary local /api/v1."
    : "Defina um intervalo completo para consultar o período.";
}

export function PlanningCustomPeriodView({
  startDate,
  endDate,
  periodStatus,
  onStartDateChange,
  onEndDateChange,
}: Readonly<{
  startDate: string;
  endDate: string;
  periodStatus: PlanningPeriodStatus;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}>) {
  const settingsQuery = useOrderSettings();
  const normalizedTimeZone = settingsQuery.data?.timezone ?? "Europe/Lisbon";
  const shouldFetch = settingsQuery.isSuccess && periodStatus === "ready";
  const planningQuery = usePeriodPlanning(startDate, endDate, shouldFetch);
  const initialLoading = shouldFetch && (settingsQuery.isLoading || planningQuery.isLoading);
  const fatalError = settingsQuery.error ?? planningQuery.error;

  const statusMessage =
    shouldFetch && planningQuery.isFetching
      ? "A atualizar leitura operacional..."
      : buildPeriodStatusLabel(periodStatus, startDate, endDate);

  if (!settingsQuery.data && settingsQuery.isLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-5">
          <p className="text-sm text-muted-foreground">
            A carregar a configuração operacional do painel...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-border/70 bg-background/80 p-4 md:grid-cols-[minmax(0,16rem)_minmax(0,16rem)_auto] md:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="planning-period-start">
            Data inicial
          </label>
          <Input
            id="planning-period-start"
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="planning-period-end">
            Data final
          </label>
          <Input
            id="planning-period-end"
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
          />
        </div>

        <div className="text-sm text-muted-foreground">{statusMessage}</div>
      </div>

      {periodStatus === "incomplete" ? (
        <EmptyState
          title="Intervalo incompleto"
          description="O planeamento por período só é consultado quando existirem data inicial e data final."
        />
      ) : null}

      {periodStatus === "invalid" ? (
        <EmptyState
          title="Intervalo inválido"
          description="Corrija o intervalo antes de consultar o planeamento. A data final tem de ser igual ou posterior à inicial."
        />
      ) : null}

      {periodStatus === "ready" && initialLoading ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card/90 p-5">
            <p className="text-sm text-muted-foreground">
              A carregar o planeamento operacional do período...
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-2xl border border-border/70 bg-card/60"
              />
            ))}
          </div>
        </section>
      ) : null}

      {periodStatus === "ready" && !initialLoading && (fatalError || !planningQuery.data) ? (
        <EmptyState
          title="Erro ao carregar o planeamento por período"
          description={
            fatalError instanceof Error
              ? fatalError.message
              : "Não foi possível carregar o planeamento operacional deste período."
          }
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void settingsQuery.refetch();
                void planningQuery.refetch();
              }}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : null}

      {periodStatus === "ready" && !initialLoading && planningQuery.data ? (
        <PlanningCustomPeriodBoard
          data={planningQuery.data}
          timeZone={normalizedTimeZone}
          startDate={startDate}
          endDate={endDate}
          statusLabels={settingsQuery.data?.statusLabels}
        />
      ) : null}
    </section>
  );
}
