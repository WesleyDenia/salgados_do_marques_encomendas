"use client";

import * as React from "react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { OrderComposerLauncher } from "@/features/orders/components/order-composer-launcher";
import { OrderSearch } from "@/features/orders/components/order-search";
import { useDebouncedValue } from "@/features/orders/hooks/use-debounced-value";
import { useOrderSearch, type OrderOperationalPeriod } from "@/features/orders/hooks/use-order-search";
import { useOrderSettings } from "@/features/orders/hooks/use-order-queries";
import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_SLOT_LABELS,
  type Order,
  type OrderPaymentStatus,
  type OrderSlot,
} from "@/features/orders/types";
import {
  formatOperationalDateTime,
  getZonedParts,
} from "@/features/orders/utils/operational-timezone";
import { useDailyPlanning } from "@/features/planning/hooks/use-daily-planning";
import type {
  PlanningSlotOccupancy,
  PlanningSlotOccupancyEntry,
  PlanningSummary,
} from "@/features/planning/types";
import { cn } from "@/lib/utils";

function buildOperationalDay(timeZone: string) {
  const now = getZonedParts(new Date(), timeZone);

  return `${String(now.year).padStart(4, "0")}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;
}

function buildOrderStatusLabel(order: Order, statusLabels?: Record<string, string>) {
  return statusLabels?.[order.status] ?? order.status;
}

function buildCustomerLabel(order: Order) {
  return order.customerName ?? order.user?.name ?? "Cliente não identificado";
}

function buildItemsCount(order: Order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function formatCurrency(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function isFinishedOrder(order: Order) {
  return ["done", "canceled", "rejected"].includes(order.status);
}

function getUpcomingOrders(orders: Order[]) {
  return [...orders]
    .filter((order) => !isFinishedOrder(order))
    .sort((a, b) => {
      const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;

      return aTime - bTime;
    })
    .slice(0, 5);
}

function getAttentionOrders(orders: Order[]) {
  return [...orders]
    .filter(
      (order) =>
        !isFinishedOrder(order) &&
        (order.paymentStatus !== "paid" || order.status === "placed" || order.status === "accepted"),
    )
    .sort((a, b) => {
      const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;

      return aTime - bTime;
    })
    .slice(0, 5);
}

function buildOrdersHref(period: OrderOperationalPeriod, search?: string) {
  const params = new URLSearchParams();

  params.set("period", period);

  if (search?.trim()) {
    params.set("search", search.trim());
  }

  return `/orders?${params.toString()}`;
}

function SummaryCard({
  title,
  value,
  description,
}: Readonly<{
  title: string;
  value: string | number;
  description: string;
}>) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card/90 p-5">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}

function OperationalSection({
  title,
  description,
  action,
  children,
}: Readonly<{
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/90 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function OrderList({
  orders,
  emptyTitle,
  emptyDescription,
  timeZone,
  statusLabels,
}: Readonly<{
  orders: Order[];
  emptyTitle: string;
  emptyDescription: string;
  timeZone: string;
  statusLabels?: Record<string, string>;
}>) {
  if (orders.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className="p-5" />;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <article
          key={String(order.id)}
          className="rounded-2xl border border-border/70 bg-background/80 p-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Encomenda #{order.id} · {buildCustomerLabel(order)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatOperationalDateTime(order.scheduledAt, timeZone)}
              </p>
              <p className="text-sm text-muted-foreground">
                {buildItemsCount(order)} itens · {formatCurrency(order.total)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full border border-border/70 px-3 py-1 text-foreground">
                {buildOrderStatusLabel(order, statusLabels)}
              </span>
              <span className="rounded-full border border-border/70 px-3 py-1 text-foreground">
                {ORDER_PAYMENT_STATUS_LABELS[(order.paymentStatus ?? "pending") as OrderPaymentStatus] ??
                  "Pagamento pendente"}
              </span>
              <span className="rounded-full border border-border/70 px-3 py-1 text-foreground">
                {ORDER_SLOT_LABELS[(order.slot ?? "manha") as OrderSlot] ?? "Sem slot"}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function SlotOccupancyCard({
  slotKey,
  entry,
}: Readonly<{
  slotKey: string;
  entry?: PlanningSlotOccupancyEntry;
}>) {
  const label =
    entry?.label ??
    ORDER_SLOT_LABELS[(slotKey as OrderSlot) ?? "manha"] ??
    slotKey;

  return (
    <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {entry?.count ?? 0}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
            entry?.state === "bloqueado" && "bg-destructive/10 text-destructive",
            entry?.state === "limitado" && "bg-amber-100 text-amber-900",
            (!entry?.state || entry.state === "disponível") && "bg-emerald-100 text-emerald-900",
          )}
        >
          {entry?.state ?? "disponível"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {entry?.contextReason ??
          "Leitura do volume previsto neste slot com base nas encomendas do dia."}
      </p>
    </article>
  );
}

function DashboardContent({
  timeZone,
  summary,
  slotOccupancy,
  upcomingOrders,
  attentionOrders,
  searchedOrders,
  search,
  onSearchChange,
  onSearchClear,
  isSearching,
  statusLabels,
  role,
}: Readonly<{
  timeZone: string;
  summary: PlanningSummary | null;
  slotOccupancy: PlanningSlotOccupancy;
  upcomingOrders: Order[];
  attentionOrders: Order[];
  searchedOrders: Order[];
  search: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  isSearching: boolean;
  statusLabels?: Record<string, string>;
  role: string;
}>) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-card/90 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Operação do dia
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Acompanhe as encomendas em andamento e avance para a próxima ação.
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              O dashboard agora resume o trabalho operacional: volume do dia,
              prioridades imediatas, capacidade por slot e acesso rápido à fila
              completa.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <OrderComposerLauncher role={role} />
            <Link href="/orders?period=today">
              <Button variant="outline">Ver encomendas de hoje</Button>
            </Link>
            <Link href={`/planning?view=day&day=${buildOperationalDay(timeZone)}`}>
              <Button variant="outline">Abrir planeamento de hoje</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Encomendas de hoje"
          value={summary?.orderCount ?? 0}
          description="Total previsto para o dia operacional corrente."
        />
        <SummaryCard
          title="Itens a produzir"
          value={summary?.itemQuantity ?? 0}
          description="Volume agregado de itens nas encomendas previstas."
        />
        <SummaryCard
          title="Pagamentos confirmados"
          value={summary?.paidCount ?? 0}
          description="Encomendas já marcadas como pagas no dataset oficial."
        />
        <SummaryCard
          title="Pedem atenção"
          value={summary?.attentionCount ?? attentionOrders.length}
          description="Encomendas que ainda exigem validação ou acompanhamento."
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <OperationalSection
          title="Próximas retiradas"
          description="Encomendas de hoje ordenadas por agendamento para ajudar a priorizar atendimento e produção."
          action={
            <Link href="/orders?period=today">
              <Button variant="outline">Abrir fila completa</Button>
            </Link>
          }
        >
          <OrderList
            orders={upcomingOrders}
            emptyTitle="Sem retiradas pendentes para hoje"
            emptyDescription="Quando houver encomendas agendadas para hoje, elas aparecerão aqui em ordem operacional."
            timeZone={timeZone}
            statusLabels={statusLabels}
          />
        </OperationalSection>

        <OperationalSection
          title="Capacidade por slot"
          description="Leitura rápida do volume previsto em cada janela operacional do dia."
        >
          <div className="grid gap-3">
            {(["manha", "tarde", "noite"] as const).map((slotKey) => (
              <SlotOccupancyCard
                key={slotKey}
                slotKey={slotKey}
                entry={slotOccupancy[slotKey]}
              />
            ))}
          </div>
        </OperationalSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <OperationalSection
          title="Fila prioritária"
          description="Recorte das encomendas que mais tendem a exigir ação imediata no painel."
        >
          <OrderList
            orders={attentionOrders}
            emptyTitle="Nenhuma prioridade crítica agora"
            emptyDescription="As encomendas do dia estão num estado estável neste momento."
            timeZone={timeZone}
            statusLabels={statusLabels}
          />
        </OperationalSection>

        <OperationalSection
          title="Pesquisa rápida"
          description="Localize uma encomenda específica sem sair do dashboard."
          action={
            <Link href={buildOrdersHref("today", search)}>
              <Button variant="outline">Abrir pesquisa completa</Button>
            </Link>
          }
        >
          <div className="space-y-4">
            <OrderSearch
              value={search}
              onChange={onSearchChange}
              onClear={onSearchClear}
              loading={isSearching}
              helpTextIdle="Pesquise por cliente, contacto ou número da encomenda para abrir a fila já filtrada."
            />

            <OrderList
              orders={searchedOrders}
              emptyTitle="Nenhuma encomenda encontrada"
              emptyDescription="Ajuste o termo pesquisado ou abra a pesquisa completa para ver mais resultados."
              timeZone={timeZone}
              statusLabels={statusLabels}
            />
          </div>
        </OperationalSection>
      </div>
    </div>
  );
}

export function OperationalDashboard({
  role,
}: Readonly<{
  role: string;
}>) {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const settingsQuery = useOrderSettings();
  const timeZone = settingsQuery.data?.timezone ?? "Europe/Lisbon";
  const day = React.useMemo(() => buildOperationalDay(timeZone), [timeZone]);
  const planningQuery = useDailyPlanning(day, true);
  const searchQuery = useOrderSearch({
    search: debouncedSearch,
    period: "today",
    page: 1,
  });

  const dashboardError = settingsQuery.error ?? planningQuery.error ?? searchQuery.error;

  if (dashboardError) {
    return (
      <EmptyState
        title="Não foi possível carregar o dashboard operacional"
        description="Tente novamente em instantes ou avance para a fila de encomendas para continuar a operação."
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/orders?period=today">
              <Button>Ir para encomendas</Button>
            </Link>
            <Link href={`/planning?view=day&day=${day}`}>
              <Button variant="outline">Ir para planeamento</Button>
            </Link>
          </div>
        }
      />
    );
  }

  if (settingsQuery.isLoading || planningQuery.isLoading || searchQuery.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-2xl border border-border/70 bg-card/60"
          />
        ))}
      </div>
    );
  }

  const planningData = planningQuery.data;
  const searchData = searchQuery.data?.data ?? [];
  const upcomingOrders = getUpcomingOrders(planningData?.orders ?? []);
  const attentionOrders = getAttentionOrders(planningData?.orders ?? []);
  const searchedOrders = (debouncedSearch.trim() ? searchData : upcomingOrders).slice(0, 5);

  return (
    <DashboardContent
      role={role}
      timeZone={timeZone}
      summary={planningData?.summary ?? null}
      slotOccupancy={planningData?.slotOccupancy ?? {}}
      upcomingOrders={upcomingOrders}
      attentionOrders={attentionOrders}
      searchedOrders={searchedOrders}
      search={search}
      onSearchChange={setSearch}
      onSearchClear={() => setSearch("")}
      isSearching={searchQuery.isFetching}
      statusLabels={settingsQuery.data?.statusLabels}
    />
  );
}
