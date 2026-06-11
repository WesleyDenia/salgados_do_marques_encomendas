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
import { useWeeklyPlanning } from "@/features/planning/hooks/use-weekly-planning";
import type { WeeklyPlanningResponse } from "@/features/planning/types";
import {
  buildPlanningCustomerLabel,
  buildPlanningLoadLabel,
  buildPlanningPaymentLabel,
  buildPlanningOfficialDayGroups,
  buildPlanningSlotLabel,
  buildPlanningWeekDateRange,
  buildPlanningWeekOrderGroups,
} from "@/features/planning/utils";

function buildSummaryCards(data: WeeklyPlanningResponse) {
  if (!data.summary) {
    return [];
  }

  return [
    {
      label: "Encomendas da semana",
      value: String(data.summary.orderCount),
      description: `Conjunto completo de ${data.selectedWeekLabel}.`,
    },
    {
      label: "Carga total",
      value: `${data.summary.itemQuantity} itens`,
      description: "Quantidade total de itens para leitura operacional semanal.",
    },
    {
      label: "Pagas",
      value: String(data.summary.paidCount),
      description: "Encomendas já liquidadas no conjunto semanal.",
    },
    {
      label: "A pedir atenção",
      value: String(data.summary.attentionCount),
      description: "Estados colocados ou aceites a acompanhar na semana.",
    },
  ];
}

export function PlanningWeeklyBoard({
  data,
  timeZone,
  weekStart,
  statusLabels,
}: Readonly<{
  data: WeeklyPlanningResponse;
  timeZone: string;
  weekStart: string;
  statusLabels?: Record<string, string>;
}>) {
  const summaryCards = buildSummaryCards(data);
  const weekRange = buildPlanningWeekDateRange(weekStart, timeZone);
  const officialDayGroups = buildPlanningOfficialDayGroups(data.daySummaries);
  const detailDayGroups = buildPlanningWeekOrderGroups(data, timeZone);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Módulo /planning
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Planeamento semanal
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Esta vista expande o planeamento diário para antecipar concentração de
          trabalho ao longo da semana, mantendo o backend como fonte oficial dos
          agregados.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Semana operacional consultada: <strong>{data.selectedWeekLabel}</strong>{" "}
          ({weekStart} · limites {weekRange.scheduledFrom} até {weekRange.scheduledTo}).
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
          O backend não devolveu um resumo oficial da semana. A leitura abaixo usa
          o dataset oficial das encomendas e os agregados diários disponíveis.
        </div>
      )}

      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <PlanningSlotLoadSummary
          title="Carga agregada por slot"
          description="O resumo semanal usa apenas os agregados oficiais do backend e mantém a mesma ordem de leitura entre superfícies."
          slotLabels={data.slotLabels}
          groups={[
            {
              id: "weekly-total",
              label: "Total da semana",
              slotCounts: data.summary?.slotCounts ?? {},
            },
          ]}
        />
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <PlanningSlotOccupancySummary
          title="Ocupação oficial por slot"
          description="O total semanal preserva a contagem oficial, mas só afirma disponibilidade quando o backend dispõe de contexto único e não ambíguo."
          slotLabels={data.slotLabels}
          groups={[
            {
              id: "weekly-occupancy-total",
              label: "Total da semana",
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
            Os cartões abaixo refletem os agregados oficiais da API semanal por dia
            operacional e, quando existe contexto único, o respetivo estado textual de slot.
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
                      id: `weekly-day-${dayKey}`,
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
                        id: `weekly-day-occupancy-${dayKey}`,
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
          title="Sem encomendas para esta semana operacional"
          description={`Não existem encomendas registadas para ${data.selectedWeekLabel}. Escolha outra semana para continuar a leitura operacional.`}
        />
      ) : (
        <section className="space-y-6">
          {detailDayGroups.map(({ dayKey, summary, orders }) => (
            <section key={dayKey} className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">{summary.label}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {orders.length > 0
                    ? "Leitura operacional do dia dentro da semana selecionada."
                    : "Sem encomendas detalhadas para este dia no dataset atual."}
                </p>
              </div>

              {orders.length === 0 ? (
                <EmptyState
                  title="Sem encomendas neste dia"
                  description="O agregado oficial existe, mas não há linhas detalhadas para apresentar neste momento."
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
                        key={`weekly-mobile-${dayKey}-${order.id}`}
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

export function PlanningWeeklyView({
  weekStart,
  onWeekStartChange,
}: Readonly<{
  weekStart: string;
  onWeekStartChange: (value: string) => void;
}>) {
  const settingsQuery = useOrderSettings();
  const normalizedTimeZone = settingsQuery.data?.timezone ?? "Europe/Lisbon";
  const planningQuery = useWeeklyPlanning(weekStart, settingsQuery.isSuccess);
  const initialLoading = settingsQuery.isLoading || planningQuery.isLoading;
  const fatalError = settingsQuery.error ?? planningQuery.error;

  if (initialLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-5">
          <p className="text-sm text-muted-foreground">
            A carregar o planeamento operacional da semana...
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
    );
  }

  if (fatalError || !planningQuery.data) {
    const message =
      fatalError instanceof Error
        ? fatalError.message
        : "Não foi possível carregar o planeamento operacional desta semana.";

    return (
      <EmptyState
        title="Erro ao carregar o planeamento semanal"
        description={message}
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
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-border/70 bg-background/80 p-4 md:grid-cols-[minmax(0,16rem)_auto] md:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="planning-week-start">
            Início da semana
          </label>
          <Input
            id="planning-week-start"
            type="date"
            value={weekStart}
            onChange={(event) => onWeekStartChange(event.target.value)}
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {planningQuery.isFetching
            ? "A atualizar leitura operacional..."
            : "Dados sincronizados com a boundary local /api/v1."}
        </div>
      </div>

      <PlanningWeeklyBoard
        data={planningQuery.data}
        timeZone={normalizedTimeZone}
        weekStart={weekStart}
        statusLabels={settingsQuery.data?.statusLabels}
      />
    </section>
  );
}
