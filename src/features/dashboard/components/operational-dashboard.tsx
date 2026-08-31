"use client";

import * as React from "react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderSearch } from "@/features/orders/components/order-search";
import {
  buildProductDemandSummary,
  type ProductDemandSummary,
} from "@/features/dashboard/utils/product-demand";
import {
  buildProductDemandDateRange,
  formatDateInputValue,
  isValidDateInputValue,
  normalizeProductDemandPeriod,
  PRODUCT_DEMAND_PERIOD_LABELS,
  PRODUCT_DEMAND_PERIODS,
  type ProductDemandPeriod,
} from "@/features/dashboard/utils/product-demand-period";
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
import { usePeriodPlanning } from "@/features/planning/hooks/use-period-planning";
import type {
  PlanningSlotOccupancy,
  PlanningSlotOccupancyEntry,
  PlanningSummary,
} from "@/features/planning/types";
import { cn } from "@/lib/utils";

function buildOperationalDay(timeZone: string, now = new Date()) {
  return formatDateInputValue(getZonedParts(now, timeZone));
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

function buildPlanningPeriodHref(startDate: string, endDate: string) {
  const params = new URLSearchParams();

  params.set("view", "period");

  if (startDate.trim()) {
    params.set("start_date", startDate.trim());
  }

  if (endDate.trim()) {
    params.set("end_date", endDate.trim());
  }

  return `/planning?${params.toString()}`;
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

function ProductDemandSection({
  timeZone,
}: Readonly<{
  timeZone: string;
}>) {
  const [dateAnchor, setDateAnchor] = React.useState(() => new Date());
  const today = React.useMemo(() => buildOperationalDay(timeZone, dateAnchor), [dateAnchor, timeZone]);
  const [period, setPeriod] = React.useState<ProductDemandPeriod>("today");
  const [customStartDate, setCustomStartDate] = React.useState(today);
  const [customEndDate, setCustomEndDate] = React.useState(today);
  const customRangeTouchedRef = React.useRef(false);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => setDateAnchor(new Date()), 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  React.useEffect(() => {
    if (!customRangeTouchedRef.current) {
      setCustomStartDate(today);
      setCustomEndDate(today);
    }
  }, [today]);

  const { startDate, endDate } = React.useMemo(
    () => buildProductDemandDateRange(period, timeZone, customStartDate, customEndDate, dateAnchor),
    [customEndDate, customStartDate, dateAnchor, period, timeZone],
  );
  const isRangeIncomplete = startDate.trim() === "" || endDate.trim() === "";
  const isRangeMalformed =
    !isRangeIncomplete &&
    (!isValidDateInputValue(startDate) || !isValidDateInputValue(endDate));
  const isRangeInvalid = !isRangeIncomplete && !isRangeMalformed && endDate < startDate;
  const shouldFetch = !isRangeIncomplete && !isRangeMalformed && !isRangeInvalid;
  const planningQuery = usePeriodPlanning(startDate, endDate, shouldFetch);
  const demandSummary = React.useMemo<ProductDemandSummary | null>(
    () =>
      planningQuery.data
        ? buildProductDemandSummary(planningQuery.data.orders)
        : null,
    [planningQuery.data],
  );

  let content: React.ReactNode;

  if (isRangeIncomplete) {
    content = (
      <EmptyState
        title="Período incompleto"
        description="Defina data inicial e data final para calcular o quantitativo necessário por produto."
        className="p-5"
      />
    );
  } else if (isRangeMalformed) {
    content = (
      <EmptyState
        title="Período inválido"
        description="Use datas válidas no formato ano-mês-dia para calcular o quantitativo necessário."
        className="p-5"
      />
    );
  } else if (isRangeInvalid) {
    content = (
      <EmptyState
        title="Período inválido"
        description="A data final tem de ser igual ou posterior à data inicial."
        className="p-5"
      />
    );
  } else if (planningQuery.isLoading) {
    content = (
      <div className="rounded-2xl border border-border/70 bg-background/80 p-5 text-sm text-muted-foreground">
        A carregar o quantitativo de produtos para o período selecionado...
      </div>
    );
  } else if (planningQuery.error || !demandSummary) {
    content = (
      <EmptyState
        title="Erro ao calcular o quantitativo"
        description={
          planningQuery.error instanceof Error
            ? planningQuery.error.message
            : "Não foi possível calcular o quantitativo necessário para este período."
        }
        className="p-5"
        action={
          <Button type="button" variant="outline" onClick={() => void planningQuery.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  } else if (demandSummary.rows.length === 0) {
    content = (
      <EmptyState
        title="Sem produtos por preparar"
        description="Não existem encomendas ativas no período selecionado para gerar necessidade de stock."
        className="p-5"
      />
    );
  } else {
    content = (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            {demandSummary.orderCount} encomendas ativas · {demandSummary.totalQuantity} unidades
            totais
          </p>
          <p>
            Período consultado: <strong>{startDate}</strong> até <strong>{endDate}</strong>
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-background/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">QTD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demandSummary.rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-right font-semibold">{row.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  const planningAction = shouldFetch ? (
    <Link href={buildPlanningPeriodHref(startDate, endDate)}>
      <Button variant="outline">Abrir no planeamento</Button>
    </Link>
  ) : (
    <Button type="button" variant="outline" disabled>
      Abrir no planeamento
    </Button>
  );

  return (
    <OperationalSection
      title="Necessidade de stock por produto"
      description="Consolida os itens das encomendas ativas do período para indicar quanto precisa produzir ou separar."
      action={planningAction}
    >
      <div className="space-y-5">
        <div className="grid gap-4 rounded-2xl border border-border/70 bg-background/80 p-4 md:grid-cols-[minmax(0,16rem)_minmax(0,16rem)_minmax(0,16rem)] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="dashboard-stock-period">
              Período
            </label>
            <Select
              value={period}
              onValueChange={(value) => setPeriod(normalizeProductDemandPeriod(value))}
            >
              <SelectTrigger id="dashboard-stock-period">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_DEMAND_PERIODS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PRODUCT_DEMAND_PERIOD_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {period === "custom" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="dashboard-stock-start">
                  Data inicial
                </label>
                <Input
                  id="dashboard-stock-start"
                  type="date"
                  value={customStartDate}
                  onChange={(event) => {
                    customRangeTouchedRef.current = true;
                    setCustomStartDate(event.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="dashboard-stock-end">
                  Data final
                </label>
                <Input
                  id="dashboard-stock-end"
                  type="date"
                  min={customStartDate || undefined}
                  value={customEndDate}
                  onChange={(event) => {
                    customRangeTouchedRef.current = true;
                    setCustomEndDate(event.target.value);
                  }}
                />
              </div>
            </>
          ) : null}

          <p className="text-sm text-muted-foreground md:col-span-full">
            {planningQuery.isFetching && shouldFetch
              ? "A atualizar o quantitativo do período..."
              : "O cálculo considera apenas encomendas ativas, excluindo canceladas, rejeitadas e concluídas."}
          </p>
        </div>

        {content}
      </div>
    </OperationalSection>
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
  appliedSearch,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  isSearching,
  statusLabels,
}: Readonly<{
  timeZone: string;
  summary: PlanningSummary | null;
  slotOccupancy: PlanningSlotOccupancy;
  upcomingOrders: Order[];
  attentionOrders: Order[];
  searchedOrders: Order[];
  search: string;
  appliedSearch: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  isSearching: boolean;
  statusLabels?: Record<string, string>;
}>) {
  const fullSearchTerm = search.trim() || appliedSearch;

  return (
    <div className="space-y-6">
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

      <ProductDemandSection timeZone={timeZone} />

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
            <Link href={buildOrdersHref("today", fullSearchTerm)}>
              <Button variant="outline">Abrir pesquisa completa</Button>
            </Link>
          }
        >
          <div className="space-y-4">
            <OrderSearch
              value={search}
              onChange={onSearchChange}
              onSubmit={onSearchSubmit}
              onClear={onSearchClear}
              loading={isSearching}
              label="Nome ou telefone do cliente"
              placeholder="Buscar por nome ou telefone"
              helpTextIdle="Digite o nome ou telefone do cliente e clique em Buscar para abrir a fila já filtrada."
            />

            <OrderList
              orders={searchedOrders}
              emptyTitle="Nenhuma encomenda encontrada"
              emptyDescription="Ajuste o nome ou telefone pesquisado ou abra a pesquisa completa para ver mais resultados."
              timeZone={timeZone}
              statusLabels={statusLabels}
            />
          </div>
        </OperationalSection>
      </div>
    </div>
  );
}

export function OperationalDashboard() {
  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const settingsQuery = useOrderSettings();
  const timeZone = settingsQuery.data?.timezone ?? "Europe/Lisbon";
  const day = React.useMemo(() => buildOperationalDay(timeZone), [timeZone]);
  const planningQuery = useDailyPlanning(day, true);
  const searchQuery = useOrderSearch({
    search: appliedSearch,
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
  const searchedOrders = (appliedSearch.trim() ? searchData : upcomingOrders).slice(0, 5);

  return (
    <DashboardContent
      timeZone={timeZone}
      summary={planningData?.summary ?? null}
      slotOccupancy={planningData?.slotOccupancy ?? {}}
      upcomingOrders={upcomingOrders}
      attentionOrders={attentionOrders}
      searchedOrders={searchedOrders}
      search={search}
      appliedSearch={appliedSearch}
      onSearchChange={setSearch}
      onSearchSubmit={() => setAppliedSearch(search.trim())}
      onSearchClear={() => {
        setSearch("");
        setAppliedSearch("");
      }}
      isSearching={searchQuery.isFetching}
      statusLabels={settingsQuery.data?.statusLabels}
    />
  );
}
