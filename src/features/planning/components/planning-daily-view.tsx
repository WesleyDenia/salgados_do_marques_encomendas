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
import { useDailyPlanning } from "@/features/planning/hooks/use-daily-planning";
import type { DailyPlanningResponse } from "@/features/planning/types";
import {
  buildPlanningCustomerLabel,
  buildPlanningDayDateRange,
  buildPlanningLoadLabel,
  buildPlanningPaymentLabel,
  buildPlanningSlotLabel,
} from "@/features/planning/utils";

function buildSummaryCards(data: DailyPlanningResponse) {
  if (!data.summary) {
    return [];
  }

  return [
    {
      label: "Encomendas do dia",
      value: String(data.summary.orderCount),
      description: `Conjunto completo de ${data.selectedDayLabel}.`,
    },
    {
      label: "Carga total",
      value: String(data.summary.itemQuantity),
      description: "Quantidade total de itens para leitura operacional.",
    },
    {
      label: "Pagas",
      value: String(data.summary.paidCount),
      description: "Encomendas já liquidadas no conjunto filtrado.",
    },
    {
      label: "A pedir atenção",
      value: String(data.summary.attentionCount),
      description: "Estados colocados ou aceites a acompanhar no dia.",
    },
  ];
}

export function PlanningDailyBoard({
  data,
  timeZone,
  day,
  statusLabels,
}: Readonly<{
  data: DailyPlanningResponse;
  timeZone: string;
  day: string;
  statusLabels?: Record<string, string>;
}>) {
  const summaryCards = buildSummaryCards(data);
  const dayRange = buildPlanningDayDateRange(day, timeZone);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Módulo /planning
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Primeira entrega funcional do planeamento diário
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Esta área continua o trabalho de `/orders` com uma leitura do dia
          operacional, sem duplicar a fila genérica nem transportar regras de
          capacidade para o cliente.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Dia operacional consultado: <strong>{data.selectedDayLabel}</strong>{" "}
          ({day} · limites {dayRange.scheduledFrom} até {dayRange.scheduledTo}).
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
          O backend não devolveu um resumo oficial do dia. A leitura abaixo usa apenas
          o dataset oficial das encomendas e os estados de slot disponíveis.
        </div>
      )}

      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <PlanningSlotLoadSummary
          title="Carga agregada por slot"
          description="Leitura oficial da concentração de encomendas por slot para o dia operacional selecionado."
          slotLabels={data.slotLabels}
          groups={[
            {
              id: "daily-total",
              label: "Total do dia",
              slotCounts: data.summary?.slotCounts ?? {},
            },
          ]}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">
            Ocupação oficial por slot
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            A vista diária usa o contrato oficial embutido em
            {" "}
            <code>/admin/orders/daily</code>
            {" "}
            para evitar divergência permanente com
            {" "}
            <code>/orders/availability/slots</code>.
          </p>
        </div>

        <PlanningSlotOccupancySummary
          slotLabels={data.slotLabels}
          groups={[
            {
              id: "daily-occupancy",
              label: "Total do dia",
              slotOccupancy: data.slotOccupancy,
            },
          ]}
        />
      </section>

      {data.orders.length === 0 ? (
        <EmptyState
          title="Sem encomendas para este dia operacional"
          description={`Não existem encomendas registadas para ${data.selectedDayLabel}. Escolha outro dia para continuar a leitura operacional.`}
        />
      ) : (
        <section className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold tracking-tight">
              Encomendas do dia
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Lista completa do dia com horário de retirada, slot, cliente,
              estado, pagamento e carga operacional.
            </p>
          </div>

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
                {data.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {formatOperationalDateTime(order.scheduledAt, timeZone)}
                    </TableCell>
                    <TableCell>{buildPlanningCustomerLabel(order)}</TableCell>
                    <TableCell>{order.store?.name ?? "Loja não carregada"}</TableCell>
                    <TableCell>{buildPlanningSlotLabel(order)}</TableCell>
                    <TableCell>{statusLabels?.[order.status] ?? order.status}</TableCell>
                    <TableCell>{buildPlanningPaymentLabel(order)}</TableCell>
                    <TableCell>{buildPlanningLoadLabel(order)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 md:hidden">
            {data.orders.map((order) => (
              <article
                key={`mobile-${order.id}`}
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
        </section>
      )}
    </section>
  );
}

export function PlanningDailyView({
  day,
  onDayChange,
}: Readonly<{
  day: string;
  onDayChange: (value: string) => void;
}>) {
  const settingsQuery = useOrderSettings();
  const timeZone = settingsQuery.data?.timezone;
  const normalizedTimeZone = timeZone ?? "Europe/Lisbon";
  const planningQuery = useDailyPlanning(day, settingsQuery.isSuccess);
  const initialLoading = settingsQuery.isLoading || planningQuery.isLoading;
  const fatalError = settingsQuery.error ?? planningQuery.error;

  if (!timeZone && settingsQuery.isLoading) {
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

  if (initialLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-5">
          <p className="text-sm text-muted-foreground">
            A carregar o planeamento operacional do dia...
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
        : "Não foi possível carregar o planeamento operacional deste dia.";

    return (
      <EmptyState
        title="Erro ao carregar o planeamento diário"
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
          <label className="text-sm font-medium" htmlFor="planning-day">
            Dia operacional
          </label>
          <Input
            id="planning-day"
            type="date"
            value={day}
            onChange={(event) => onDayChange(event.target.value)}
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {planningQuery.isFetching
            ? "A atualizar leitura operacional..."
            : "Dados sincronizados com a boundary local /api/v1."}
        </div>
      </div>

      <PlanningDailyBoard
        data={planningQuery.data}
        timeZone={normalizedTimeZone}
        day={day}
        statusLabels={settingsQuery.data?.statusLabels}
      />
    </section>
  );
}
