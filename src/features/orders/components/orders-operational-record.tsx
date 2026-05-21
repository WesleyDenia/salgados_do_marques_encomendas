"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderComposerDrawer } from "@/features/orders/components/order-composer-drawer";
import { useUpdateOrderStatus } from "@/features/orders/hooks/use-order-mutations";
import { useOrderDetail } from "@/features/orders/hooks/use-order-queries";
import { OrderSearch } from "@/features/orders/components/order-search";
import { useDebouncedValue } from "@/features/orders/hooks/use-debounced-value";
import {
  normalizeOrderOperationalPaymentStatus,
  normalizeOrderOperationalPeriod,
  normalizeOrderOperationalSlot,
  normalizeOrderOperationalStatus,
  normalizeOrderSearchPage,
  type OrderOperationalPeriod,
  useOrderSearch,
} from "@/features/orders/hooks/use-order-search";
import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_SLOT_LABELS,
} from "@/features/orders/types";
import type { Order } from "@/features/orders/types";
import { formatOperationalDateTime } from "@/features/orders/utils/operational-timezone";
import {
  buildOrderPrintAttemptId,
  buildOrderPrintHref,
  isOrderPrintFlowEvent,
  openPrintPreviewWindow,
  type PrintFlowState,
} from "@/lib/printing";

const ORDER_OPERATIONAL_PERIOD_LABELS: Record<OrderOperationalPeriod, string> = {
  today: "Hoje",
  tomorrow: "Amanhã",
  "next-7-days": "Próximos 7 dias",
  all: "Todos",
};

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  placed: ["accepted", "rejected", "canceled"],
  accepted: ["ready", "canceled"],
  ready: ["done"],
  rejected: [],
  canceled: [],
  done: [],
};

function buildOrderItemKey(item: Order["items"][number], index: number) {
  if (item.id != null) {
    return String(item.id);
  }

  return [
    item.productId,
    item.variantId ?? "no-variant",
    item.flavorIds?.join("-") ?? "no-flavors",
    index,
  ].join(":");
}

function formatTotal(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function buildCustomerLabel(order: Order) {
  return order.customerName ?? order.user?.name ?? "Cliente não identificado";
}

function buildPaymentLabel(order: Order) {
  if (!order.paymentStatus) {
    return "Não definido";
  }

  return ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus;
}

function buildOperationalStatusLabel(
  order: Order,
  statusLabels?: Record<string, string>,
) {
  return statusLabels?.[order.status] ?? order.status;
}

function buildSlotLabel(order: Order) {
  if (!order.slot) {
    return "Não definido";
  }

  return ORDER_SLOT_LABELS[order.slot] ?? order.slot;
}

function buildItemsQuantity(order: Order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function buildFlavorSummary(item: Order["items"][number]) {
  if (item.flavorNames && item.flavorNames.length > 0) {
    return item.flavorNames.join(", ");
  }

  if (item.flavorIds && item.flavorIds.length > 0) {
    return item.flavorIds.map((id) => `#${id}`).join(", ");
  }

  return null;
}

function buildPrintStateMessage(
  state: PrintFlowState,
  errorMessage?: string | null,
) {
  switch (state) {
    case "preparing":
      return "A preparar a vista térmica 80mm para reimpressão a partir deste registo.";
    case "preview":
      return "Vista térmica de reimpressão aberta. Pode imprimir agora ou voltar a tentar sem fechar o detalhe.";
    case "printing":
      return "O diálogo de impressão está aberto. Pode concluir ou cancelar sem perder o contexto operacional.";
    case "success":
      return "A tentativa de reimpressão terminou. Pode reimprimir novamente a partir deste mesmo registo.";
    case "error":
      return errorMessage ?? "Não foi possível abrir a vista de reimpressão.";
    default:
      return "Abra uma vista térmica dedicada para reimprimir sem depender do conteúdo do detalhe.";
  }
}

export function getAllowedOrderStatusTransitions(status: string) {
  return ORDER_STATUS_TRANSITIONS[status] ?? [];
}

export async function performOrderStatusTransition({
  currentOrder,
  isPending,
  nextStatus,
  mutateStatus,
  setSelectedOrder,
  toast,
  refetchDetail,
}: {
  currentOrder: Order | null;
  isPending: boolean;
  nextStatus: string;
  mutateStatus: (input: {
    orderId: number | string;
    status: string;
  }) => Promise<Order>;
  setSelectedOrder: (order: Order) => void;
  toast: (message: string, tone: "success" | "error") => void;
  refetchDetail: () => Promise<unknown>;
}) {
  if (!currentOrder || isPending) {
    return;
  }

  try {
    const updatedOrder = await mutateStatus({
      orderId: currentOrder.id,
      status: nextStatus,
    });

    setSelectedOrder(updatedOrder);
    toast("Estado operacional atualizado com sucesso.", "success");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o estado operacional.";

    toast(message, "error");

    try {
      await refetchDetail();
    } catch {
      // Mantém o detalhe aberto com o último estado confirmado localmente.
    }
  }
}

export function OrdersOperationalRecordEmptyState({
  searchTerm,
  periodLabel,
  statusLabel,
  paymentStatusLabel,
  slotLabel,
  onClear,
}: Readonly<{
  searchTerm: string;
  periodLabel: string;
  statusLabel?: string;
  paymentStatusLabel?: string;
  slotLabel?: string;
  onClear?: () => void;
}>) {
  const hasSearch = searchTerm.trim().length > 0;
  const filterParts = [
    periodLabel,
    statusLabel ? `estado ${statusLabel}` : "",
    paymentStatusLabel ? `pagamento ${paymentStatusLabel}` : "",
    slotLabel ? `slot ${slotLabel}` : "",
  ].filter(Boolean);

  const filterSummary = filterParts.join(", ");

  return (
    <EmptyState
      title={
        hasSearch
          ? "Nenhuma encomenda encontrada"
          : "Não existem encomendas para os filtros ativos."
      }
      description={
        hasSearch
          ? `Não encontrámos resultados para "${searchTerm}". Ajuste o número, nome do cliente ou contacto e tente novamente.`
          : `Não encontrámos encomendas para os critérios: ${filterSummary}. Ajuste os filtros operacionais para continuar a triagem.`
      }
      action={
        hasSearch && onClear ? (
          <Button type="button" variant="outline" onClick={onClear}>
            Limpar pesquisa
          </Button>
        ) : undefined
      }
    />
  );
}

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  onEditOrder,
  onStatusChange,
  onPrintOrder,
  isUpdatingStatus,
  printState = "ready",
  printErrorMessage,
  statusLabels,
  timeZone,
}: Readonly<{
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditOrder?: (order: Order) => void;
  onStatusChange?: (nextStatus: string) => void;
  onPrintOrder?: (order: Order) => void;
  isUpdatingStatus?: boolean;
  printState?: PrintFlowState;
  printErrorMessage?: string | null;
  statusLabels?: Record<string, string>;
  timeZone?: string;
}>) {
  const availableTransitions = order
    ? getAllowedOrderStatusTransitions(order.status)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <SheetTitle className="text-xl">
                {order ? `Encomenda #${order.id}` : "Detalhe da encomenda"}
              </SheetTitle>
              {order && (
                <div className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {buildOperationalStatusLabel(order, statusLabels)}
                </div>
              )}
            </div>
            <SheetDescription>
              Consulte o registo atual antes de avançar para revisão ou correção.
            </SheetDescription>
            {order && availableTransitions.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Atualizar estado
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTransitions.map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={Boolean(isUpdatingStatus)}
                      onClick={() => onStatusChange?.(nextStatus)}
                    >
                      {statusLabels?.[nextStatus] ?? nextStatus}
                    </Button>
                  ))}
                </div>
                {isUpdatingStatus ? (
                  <p className="text-xs text-muted-foreground">
                    A atualizar estado operacional...
                  </p>
                ) : null}
              </div>
            ) : null}
          </SheetHeader>
          <SheetClose />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {order ? (
            <>
              {order.canEdit === false && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <p className="font-medium">Esta encomenda já não permite correções</p>
                  <p className="mt-1 opacity-90">
                    O estado atual &quot;{buildOperationalStatusLabel(order, statusLabels)}&quot; bloqueia correções aos dados da encomenda.
                  </p>
                </div>
              )}

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Cliente
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {buildCustomerLabel(order)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.customerContact ?? "Sem contacto registado"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Logística
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {order.store?.name ?? "Loja não carregada"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {buildSlotLabel(order)} · {formatOperationalDateTime(order.scheduledAt, timeZone)}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Itens registados
                </h3>
                <div className="rounded-2xl border border-border/70 bg-card/90">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Qtd.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, index) => (
                        <TableRow key={buildOrderItemKey(item, index)}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              {buildFlavorSummary(item) && (
                                <p className="text-xs text-muted-foreground mt-0.5 italic">
                                  Sabores: {buildFlavorSummary(item)}
                                </p>
                              )}
                              {item.variantName && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Variação: {item.variantName}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatTotal(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Financeiro
                  </p>
                  <p className="mt-2 text-lg font-bold text-foreground">
                    {formatTotal(order.total)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pagamento: {buildPaymentLabel(order)}
                  </p>
                </section>
                <section className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Notas operacionais
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
                    {order.notes?.trim() || "Sem notas operacionais"}
                  </p>
                </section>
              </div>

              <section className="rounded-xl border border-border/70 bg-card/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Reimpressão operacional
                    </p>
                    <p className="text-sm text-foreground">
                      {buildPrintStateMessage(printState, printErrorMessage)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={printState === "error" ? "destructive" : "outline"}
                    onClick={() => onPrintOrder?.(order)}
                  >
                    <Printer />
                    {printState === "error" ? "Tentar novamente" : "Reimprimir 80mm"}
                  </Button>
                </div>
              </section>
            </>
          ) : null}
        </div>

        {order && (
          <div className="border-t border-border/70 bg-card/30 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Criada em {formatOperationalDateTime(order.createdAt, timeZone)}
            </p>
            <Button
              type="button"
              disabled={order.canEdit === false}
              onClick={() => onEditOrder?.(order)}
            >
              Corrigir encomenda
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function OrdersOperationalRecordContent({
  orders,
  meta,
  searchSlot,
  onOpenOrder,
  onPageChange,
  statusLabels,
  isRefreshing,
  timeZone,
}: Readonly<{
  orders: Order[];
  meta?: { current_page?: number; last_page?: number; total?: number };
  searchSlot?: React.ReactNode;
  onOpenOrder?: (order: Order) => void;
  onPageChange?: (page: number) => void;
  statusLabels?: Record<string, string>;
  isRefreshing?: boolean;
  timeZone?: string;
}>) {
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? orders.length;

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Registo operacional
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Localize encomendas existentes por critérios operacionais e abra o
          registo certo para revisão antes de qualquer correção.
        </p>
      </div>

      {searchSlot}

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          {total === 1 ? "1 encomenda encontrada." : `${total} encomendas encontradas.`}
        </p>
        {isRefreshing ? (
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            A atualizar fila...
          </p>
        ) : null}
        {lastPage > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              Anterior
            </Button>
            <span>
              Página {currentPage} de {lastPage}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= lastPage}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              Seguinte
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/90">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Data/Hora de agendamento</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead>Estado do pagamento</TableHead>
              <TableHead>Estado operacional</TableHead>
              <TableHead>Quantidade total de itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                <TableCell>{buildCustomerLabel(order)}</TableCell>
                <TableCell>{order.store?.name ?? "Loja não carregada"}</TableCell>
                <TableCell>{formatOperationalDateTime(order.scheduledAt, timeZone)}</TableCell>
                <TableCell>{buildSlotLabel(order)}</TableCell>
                <TableCell>{buildPaymentLabel(order)}</TableCell>
                <TableCell>{buildOperationalStatusLabel(order, statusLabels)}</TableCell>
                <TableCell>{buildItemsQuantity(order)}</TableCell>
                <TableCell>{formatTotal(order.total)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenOrder?.(order)}
                  >
                    Abrir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {orders.map((order) => (
          <article
            key={`notes-${order.id}`}
            className="rounded-2xl border border-border/70 bg-background p-4"
          >
            <p className="text-sm font-medium text-foreground">
              Encomenda #{order.id} · {buildCustomerLabel(order)}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {order.notes?.trim() || "Sem notas operacionais persistidas."}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function OrdersOperationalRecord() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const urlSearchTerm = searchParams.get("search") ?? "";
  const currentPage = normalizeOrderSearchPage(searchParams.get("page"));
  const currentPeriod = normalizeOrderOperationalPeriod(searchParams.get("period"));
  const rawUrlStatus = searchParams.get("status");
  const rawUrlPaymentStatus = searchParams.get("payment_status");
  const rawUrlSlot = searchParams.get("slot");
  const currentSearch = searchParams.get("search") ?? "";
  const rawCurrentStatus = rawUrlStatus?.trim() ?? "";
  const rawCurrentPaymentStatus = rawUrlPaymentStatus?.trim() ?? "";
  const rawCurrentSlot = rawUrlSlot?.trim() ?? "";
  const [searchTerm, setSearchTerm] = React.useState(urlSearchTerm);
  const [period, setPeriod] = React.useState<OrderOperationalPeriod>(currentPeriod);
  const [status, setStatus] = React.useState(rawUrlStatus?.trim() ?? "");
  const [paymentStatus, setPaymentStatus] = React.useState(rawUrlPaymentStatus?.trim() ?? "");
  const [slot, setSlot] = React.useState(rawUrlSlot?.trim() ?? "");
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [printStateByOrderId, setPrintStateByOrderId] = React.useState<
    Record<string, PrintFlowState>
  >({});
  const [printErrorByOrderId, setPrintErrorByOrderId] = React.useState<
    Record<string, string | null>
  >({});
  const printAttemptByOrderIdRef = React.useRef<Record<string, string | null>>({});
  const detailQuery = useOrderDetail(selectedOrder?.id ?? null);
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const normalizedSearchTerm = debouncedSearchTerm.trim();
  const optimisticFiltersChanged =
    normalizedSearchTerm !== currentSearch ||
    period !== currentPeriod ||
    status !== rawCurrentStatus ||
    paymentStatus !== rawCurrentPaymentStatus ||
    slot !== rawCurrentSlot;
  const effectivePage = optimisticFiltersChanged ? 1 : currentPage;
  const { data, isLoading, error, isFetching, retry, settings, settingsError, statusOptions } =
    useOrderSearch({
      search: normalizedSearchTerm,
      period,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      slot: slot || undefined,
      page: effectivePage,
    });
  const currentStatus = normalizeOrderOperationalStatus(
    rawUrlStatus,
    settings?.statusLabels,
  );
  const currentPaymentStatus = normalizeOrderOperationalPaymentStatus(rawUrlPaymentStatus);
  const currentSlot = normalizeOrderOperationalSlot(rawUrlSlot);
  const statusLabels = React.useMemo(() => settings?.statusLabels, [settings?.statusLabels]);

  const selectedStatusLabel = status
    ? statusOptions.find((option) => option.value === status)?.label ?? status
    : undefined;
  const selectedPaymentStatusLabel = paymentStatus
    ? ORDER_PAYMENT_STATUS_LABELS[paymentStatus as keyof typeof ORDER_PAYMENT_STATUS_LABELS] ?? paymentStatus
    : undefined;
  const selectedSlotLabel = slot
    ? ORDER_SLOT_LABELS[slot as keyof typeof ORDER_SLOT_LABELS] ?? slot
    : undefined;

  // Sync URL to Local State (Only on mount or URL change)
  React.useEffect(() => {
    setSearchTerm(urlSearchTerm);
    setPeriod(currentPeriod);
    setStatus(currentStatus);
    setPaymentStatus(currentPaymentStatus);
    setSlot(currentSlot);
  }, [currentPeriod, currentStatus, currentPaymentStatus, currentSlot, urlSearchTerm]);

  // Sync Local State to URL (Debounced/Controlled)
  React.useEffect(() => {
    // Wait for settings to load if we have a status to normalize
    // This prevents wiping URL params if settings fetch is slow
    if (rawUrlStatus && !settings) {
      return;
    }

    const normalizedSearch = normalizedSearchTerm;
    const currentUrlPage = normalizeOrderSearchPage(searchParams.get("page"));
    const currentUrlPeriod = normalizeOrderOperationalPeriod(searchParams.get("period"));
    const currentUrlStatus = normalizeOrderOperationalStatus(
      searchParams.get("status"),
      statusLabels,
    );
    const currentUrlPaymentStatus = normalizeOrderOperationalPaymentStatus(searchParams.get("payment_status"));
    const currentUrlSlot = normalizeOrderOperationalSlot(searchParams.get("slot"));

    if (
      normalizedSearch === currentSearch &&
      currentUrlPage === effectivePage &&
      currentUrlPeriod === period &&
      currentUrlStatus === status &&
      currentUrlPaymentStatus === paymentStatus &&
      currentUrlSlot === slot
    ) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (normalizedSearch) {
      params.set("search", normalizedSearch);
    } else {
      params.delete("search");
    }

    // Reset page to 1 when filters change
    if (
      normalizedSearch !== currentSearch ||
      period !== currentUrlPeriod ||
      status !== currentUrlStatus ||
      paymentStatus !== currentUrlPaymentStatus ||
      slot !== currentUrlSlot
    ) {
      params.delete("page");
    }

    if (period === "today") {
      params.delete("period");
    } else {
      params.set("period", period);
    }

    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }

    if (paymentStatus) {
      params.set("payment_status", paymentStatus);
    } else {
      params.delete("payment_status");
    }

    if (slot) {
      params.set("slot", slot);
    } else {
      params.delete("slot");
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [currentSearch, effectivePage, normalizedSearchTerm, pathname, period, router, searchParams, settings, statusLabels, status, paymentStatus, slot, rawUrlStatus]);

  const clearSearch = React.useCallback(() => {
    setSearchTerm("");
  }, []);

  const updatePage = React.useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());

      if (page > 1) {
        params.set("page", String(page));
      } else {
        params.delete("page");
      }

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const updatePeriod = React.useCallback(
    (nextPeriod: OrderOperationalPeriod) => {
      setPeriod(nextPeriod);
    },
    [],
  );

  const updateStatus = React.useCallback(
    (nextStatus: string | null) => {
      setStatus(!nextStatus || nextStatus === "all" ? "" : nextStatus);
    },
    [],
  );

  const updatePaymentStatus = React.useCallback(
    (nextPaymentStatus: string | null) => {
      setPaymentStatus(
        !nextPaymentStatus || nextPaymentStatus === "all"
          ? ""
          : nextPaymentStatus,
      );
    },
    [],
  );

  const updateSlot = React.useCallback(
    (nextSlot: string | null) => {
      setSlot(!nextSlot || nextSlot === "all" ? "" : nextSlot);
    },
    [],
  );

  const retryLoading = React.useCallback(() => {
    void retry();
  }, [retry]);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !isOrderPrintFlowEvent(event.data)) {
        return;
      }

      const { orderId, attemptId, state, errorMessage } = event.data;
      const activeAttemptId = printAttemptByOrderIdRef.current[orderId];

      if (activeAttemptId && activeAttemptId !== attemptId) {
        return;
      }

      setPrintStateByOrderId((current) => ({
        ...current,
        [orderId]: state,
      }));
      setPrintErrorByOrderId((current) => ({
        ...current,
        [orderId]:
          state === "error"
            ? (errorMessage ?? "Não foi possível concluir a reimpressão.")
            : null,
      }));

      if (state === "printing") {
        toast("Diálogo de reimpressão aberto na vista térmica.", "info");
      } else if (state === "success") {
        toast("Tentativa de reimpressão concluída.", "success");
      } else if (state === "error") {
        toast(errorMessage ?? "Não foi possível concluir a reimpressão.", "error");
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [toast]);

  const handleStatusChange = React.useCallback(
    async (nextStatus: string) => {
      await performOrderStatusTransition({
        currentOrder: detailQuery.data ?? selectedOrder,
        isPending: updateOrderStatusMutation.isPending,
        nextStatus,
        mutateStatus: updateOrderStatusMutation.mutateAsync,
        setSelectedOrder,
        toast,
        refetchDetail: detailQuery.refetch,
      });
    },
    [detailQuery, selectedOrder, toast, updateOrderStatusMutation],
  );

  const handlePrintOrder = React.useCallback(
    (order: Order) => {
      const orderKey = String(order.id);
      const attemptId = buildOrderPrintAttemptId(order.id);

      printAttemptByOrderIdRef.current[orderKey] = attemptId;

      setPrintErrorByOrderId((current) => ({
        ...current,
        [orderKey]: null,
      }));
      setPrintStateByOrderId((current) => ({
        ...current,
        [orderKey]: "preparing",
      }));
      toast("A preparar a vista térmica de reimpressão 80mm...", "info");

      try {
        const previewWindow = openPrintPreviewWindow(
          buildOrderPrintHref(order.id, {
            attemptId,
            intent: "reprint",
          }),
          (href, target, features) => window.open(href, target, features),
        );

        if (!previewWindow) {
          throw new Error(
            "O browser bloqueou a janela de reimpressão. Permita pop-ups e tente novamente.",
          );
        }

        setPrintStateByOrderId((current) => ({
          ...current,
          [orderKey]: "preview",
        }));
        toast(
          "Vista térmica aberta. Pode reimprimir ou cancelar sem perder a encomenda.",
          "info",
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível abrir a vista de reimpressão.";

        setPrintErrorByOrderId((current) => ({
          ...current,
          [orderKey]: message,
        }));
        setPrintStateByOrderId((current) => ({
          ...current,
          [orderKey]: "error",
        }));
        toast(message, "error");
      }
    },
    [toast],
  );

  const filters = (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4">
      <OrderSearch
        value={searchTerm}
        onChange={setSearchTerm}
        onClear={clearSearch}
        loading={isFetching}
      />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Período</label>
          <Select value={period} onValueChange={(value) => updatePeriod(value as OrderOperationalPeriod)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_OPERATIONAL_PERIOD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Estado operacional
          </label>
          <Select value={status || "all"} onValueChange={updateStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Estado do pagamento
          </label>
          <Select value={paymentStatus || "all"} onValueChange={updatePaymentStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os pagamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pagamentos</SelectItem>
              {Object.entries(ORDER_PAYMENT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Slot operacional
          </label>
          <Select value={slot || "all"} onValueChange={updateSlot}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os slots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os slots</SelectItem>
              {Object.entries(ORDER_SLOT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card/80 p-5 text-sm text-muted-foreground">
        A carregar registo operacional de encomendas...
      </section>
    );
  }

  if (error || settingsError) {
    return (
      <section className="space-y-4">
        {filters}
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p>
            Não foi possível carregar o registo operacional. Verifique a sessão e a
            disponibilidade do backend.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={retryLoading}
          >
            Tentar novamente
          </Button>
        </section>
      </section>
    );
  }

  const orders = data?.data ?? [];
  const selectedOrderDetail = detailQuery.data ?? selectedOrder;

  const recordContent =
    orders.length === 0 ? (
      <section className="space-y-4">
        {filters}
        <OrdersOperationalRecordEmptyState
          searchTerm={normalizedSearchTerm}
          periodLabel={ORDER_OPERATIONAL_PERIOD_LABELS[period]}
          statusLabel={selectedStatusLabel}
          paymentStatusLabel={selectedPaymentStatusLabel}
          slotLabel={selectedSlotLabel}
          onClear={clearSearch}
        />
      </section>
    ) : (
      <OrdersOperationalRecordContent
        orders={orders}
        meta={data?.meta}
        searchSlot={filters}
        onOpenOrder={setSelectedOrder}
        onPageChange={updatePage}
        statusLabels={settings?.statusLabels}
        isRefreshing={isFetching}
        timeZone={settings?.timezone}
      />
    );

  return (
    <>
      {recordContent}
      <OrderDetailSheet
        order={selectedOrderDetail}
        open={selectedOrder !== null}
        isUpdatingStatus={updateOrderStatusMutation.isPending}
        onStatusChange={handleStatusChange}
        onPrintOrder={handlePrintOrder}
        printState={
          selectedOrder
            ? (printStateByOrderId[String(selectedOrder.id)] ?? "ready")
            : "ready"
        }
        printErrorMessage={
          selectedOrder ? printErrorByOrderId[String(selectedOrder.id)] : null
        }
        statusLabels={settings?.statusLabels}
        timeZone={settings?.timezone}
        onEditOrder={(order) => {
          setSelectedOrder(null);
          setEditingOrder(order);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
          }
        }}
      />
      <OrderComposerDrawer
        open={editingOrder !== null}
        mode="edit"
        initialOrder={editingOrder}
        onOpenChange={(open) => {
          if (!open) {
            setEditingOrder(null);
          }
        }}
        onSuccess={() => {
          setEditingOrder(null);
        }}
      />
    </>
  );
}
