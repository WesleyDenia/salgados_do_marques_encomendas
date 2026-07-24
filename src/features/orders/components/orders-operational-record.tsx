"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, LayoutGrid, List, Printer, RefreshCcw, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { OrderAuditContext } from "@/features/orders/components/order-audit-context";
import { OrderHistoryList } from "@/features/orders/components/order-history-list";
import {
  useCreateOrderPartialWithdrawal,
  useUpdateOrder,
  useUpdateOrderStatus,
} from "@/features/orders/hooks/use-order-mutations";
import {
  useOrderDetail,
  useOrderProducts,
} from "@/features/orders/hooks/use-order-queries";
import { OrderSearch } from "@/features/orders/components/order-search";
import {
  normalizeOrderOperationalPaymentStatus,
  normalizeOrderOperationalPeriod,
  normalizeOrderOperationalSlot,
  normalizeOrderOperationalStatus,
  normalizeOrderOperationalTagIds,
  normalizeOrderSearchPage,
  type OrderOperationalPeriod,
  useOrderSearch,
} from "@/features/orders/hooks/use-order-search";
import {
  getOrderRecordModeConfig,
  type OrderRecordMode,
} from "@/features/orders/order-record-mode";
import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_SLOT_LABELS,
} from "@/features/orders/types";
import type { Order, OrderProductOption, OrderTag } from "@/features/orders/types";
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
  custom: "Data personalizada",
  all: "Todos",
};

const REVALIDATE_MESSAGES = {
  errorNotFound: "Esta encomenda já não existe. Deseja fechar o detalhe?",
  errorUnknown: "Erro desconhecido",
  errorPrefix: "Não foi possível revalidar o estado:",
  errorGeneric: "Não foi possível revalidar o estado.",
  successPrefix: "Estado atualizado:",
  infoNoChanges: "O estado já se encontra atualizado",
  fieldState: "Estado",
  fieldPayment: "Pagamento",
  fieldSchedule: "Agendamento atualizado",
};

const ORDER_RECORD_VIEW_MODE_STORAGE_KEY = "orders-record-view-mode";
const ORDER_RECORD_FILTERS_OPEN_STORAGE_KEY = "orders-record-filters-open";
const ORDER_RECORD_FILTERS_STORAGE_KEY = "orders-record-filters";

type OrderRecordSearchParams = Pick<URLSearchParams, "get" | "toString">;
type PersistedOrderRecordFilters = {
  searchTerm: string;
  period: OrderOperationalPeriod;
  status: string;
  paymentStatus: string;
  slot: string;
  tagIds: number[];
  customStartDate: string;
  customEndDate: string;
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

function buildOrderRecordFiltersStorageKey(mode: OrderRecordMode) {
  return `${ORDER_RECORD_FILTERS_STORAGE_KEY}:${mode}`;
}

function hasExplicitOrderFilterParams(searchParams: OrderRecordSearchParams) {
  return [
    "search",
    "period",
    "status",
    "payment_status",
    "slot",
    "tag_ids",
    "start_date",
    "end_date",
  ].some((key) => searchParams.get(key) != null);
}

function parsePersistedOrderRecordFilters(
  value: string | null,
  defaultPeriod: OrderOperationalPeriod,
): PersistedOrderRecordFilters | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PersistedOrderRecordFilters>;
    const normalizedPeriod = normalizeOrderOperationalPeriod(
      typeof parsed.period === "string" ? parsed.period : null,
      defaultPeriod,
    );

    return {
      searchTerm: typeof parsed.searchTerm === "string" ? parsed.searchTerm : "",
      period: normalizedPeriod,
      status: typeof parsed.status === "string" ? parsed.status : "",
      paymentStatus:
        typeof parsed.paymentStatus === "string" ? parsed.paymentStatus : "",
      slot: typeof parsed.slot === "string" ? parsed.slot : "",
      tagIds: Array.isArray(parsed.tagIds)
        ? parsed.tagIds.filter((tagId): tagId is number => Number.isInteger(tagId) && tagId > 0)
        : [],
      customStartDate:
        typeof parsed.customStartDate === "string" ? parsed.customStartDate : "",
      customEndDate:
        typeof parsed.customEndDate === "string" ? parsed.customEndDate : "",
    };
  } catch {
    return null;
  }
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

function buildPartialWithdrawalItemLabel(item: Order["items"][number]) {
  const remainingUnits = item.remainingUnits ?? item.originalUnits ?? item.quantity;
  const baseLabel = item.variantName?.trim() || item.productName;

  return `${baseLabel} · saldo ${remainingUnits} unid.`;
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

function flattenFlavorCounts(flavorCounts: Record<number, number>) {
  return Object.entries(flavorCounts).flatMap(([flavorId, quantity]) =>
    Array.from({ length: Math.max(0, quantity) }, () => Number(flavorId)),
  );
}

function resolveRequiredWithdrawalFlavorCount(
  item: Order["items"][number] | undefined,
  product: OrderProductOption | null,
  requestedUnits: number,
) {
  if (!item || !Number.isFinite(requestedUnits) || requestedUnits < 1) {
    return 0;
  }

  const originalUnits = Math.max(1, item.originalUnits ?? item.quantity);
  const parentFlavorCount = item.flavorIds?.length ?? 0;

  if (parentFlavorCount > 0) {
    return Math.max(1, Math.round((parentFlavorCount * requestedUnits) / originalUnits));
  }

  const selectedVariant =
    product?.variants?.find((variant) => variant.id === item.variantId) ?? null;

  if ((selectedVariant?.maxFlavors ?? 0) > 0 && (selectedVariant?.unitCount ?? 0) > 0) {
    return Math.max(
      1,
      Math.round(
        (selectedVariant!.maxFlavors * requestedUnits) /
          Math.max(1, selectedVariant!.unitCount),
      ),
    );
  }

  return 0;
}

function buildWithdrawalFlavorSummary(
  withdrawal: NonNullable<Order["partialWithdrawals"]>[number],
) {
  if (withdrawal.flavorNames && withdrawal.flavorNames.length > 0) {
    return withdrawal.flavorNames.join(", ");
  }

  if (withdrawal.flavorIds && withdrawal.flavorIds.length > 0) {
    return withdrawal.flavorIds.map((flavorId) => `#${flavorId}`).join(", ");
  }

  return null;
}

function buildPartialWithdrawalStatusSummary(order: Order) {
  const withdrawals = order.partialWithdrawals ?? [];

  if (withdrawals.length === 0) {
    return null;
  }

  const totalUnits = withdrawals.reduce(
    (total, withdrawal) => total + withdrawal.requestedUnits,
    0,
  );

  return {
    totalUnits,
    totalWithdrawals: withdrawals.length,
  };
}

function OrdersOperationalRecordTotal({
  total,
}: Readonly<{
  total: number;
}>) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
      Total de registros: {total}
    </div>
  );
}

function canOrderRegisterPartialWithdrawal(order?: Order | null) {
  if (!order || order.parentOrderId != null) {
    return false;
  }

  return order.items.some(
    (item) => item.canWithdrawPartially && (item.remainingUnits ?? 0) >= 25,
  );
}

function buildTagTextColor(color: string) {
  const normalized = color.replace("#", "");
  if (normalized.length !== 6) {
    return "#111827";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.65 ? "#111827" : "#FFFFFF";
}

function renderOrderTagBadge(tag: OrderTag) {
  return (
    <span
      key={tag.id}
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: tag.color,
        backgroundColor: tag.color,
        color: buildTagTextColor(tag.color),
      }}
    >
      {tag.name}
    </span>
  );
}

function formatCustomerContact(value?: string | null) {
  if (!value) {
    return "Por definir";
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  return value;
}

function formatScheduledAtDetailed(value?: string | null, timeZone = "Europe/Lisbon") {
  if (!value) {
    return "Por agendar";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const weekday = new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    weekday: "long",
  }).format(parsed);
  const date = new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
  const time = new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(parsed);

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date} às ${time}`;
}

function buildOrderCardItemTitle(item: Order["items"][number]) {
  if (item.variantName?.trim()) {
    return item.variantName.trim();
  }

  if (item.quantity > 1) {
    return `${item.productName} x${item.quantity}`;
  }

  return item.productName;
}

function getDateInputValue(value?: string | null, timeZone = "Europe/Lisbon") {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(parsed);
}

function getTimeInputValue(value?: string | null, timeZone = "Europe/Lisbon") {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(parsed);
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

export function buildOrdersRecordUrl({
  pathname,
  searchParams,
  normalizedSearch,
  effectivePage,
  period,
  customStartDate,
  customEndDate,
  defaultPeriod,
  status,
  paymentStatus,
  slot,
  tagIds = [],
  statusLabels,
}: Readonly<{
  pathname: string;
  searchParams: OrderRecordSearchParams;
  normalizedSearch: string;
  effectivePage: number;
  period: OrderOperationalPeriod;
  customStartDate: string;
  customEndDate: string;
  defaultPeriod: OrderOperationalPeriod;
  status: string;
  paymentStatus: string;
  slot: string;
  tagIds?: number[];
  statusLabels?: Record<string, string>;
}>) {
  const currentSearch = searchParams.get("search") ?? "";
  const rawPageParam = searchParams.get("page");
  const currentUrlPage = normalizeOrderSearchPage(searchParams.get("page"));
  const rawPeriodParam = searchParams.get("period");
  const rawStatusParam = searchParams.get("status");
  const rawPaymentStatusParam = searchParams.get("payment_status");
  const rawSlotParam = searchParams.get("slot");
  const rawTagIdsParam = searchParams.get("tag_ids");
  const rawStartDateParam = searchParams.get("start_date");
  const rawEndDateParam = searchParams.get("end_date");
  const currentUrlPeriod = normalizeOrderOperationalPeriod(
    rawPeriodParam,
    defaultPeriod,
  );
  const currentUrlStatus = normalizeOrderOperationalStatus(
    searchParams.get("status"),
    statusLabels,
  );
  const currentUrlPaymentStatus = normalizeOrderOperationalPaymentStatus(
    searchParams.get("payment_status"),
  );
  const currentUrlSlot = normalizeOrderOperationalSlot(searchParams.get("slot"));
  const currentUrlTagIds = normalizeOrderOperationalTagIds(rawTagIdsParam);
  const pageParamIsCanonical =
    effectivePage === 1
      ? rawPageParam == null
      : rawPageParam === String(effectivePage);
  const periodParamIsCanonical =
    period === defaultPeriod ? rawPeriodParam == null : rawPeriodParam === period;
  const statusParamIsCanonical =
    status === "" ? rawStatusParam == null : rawStatusParam === status;
  const paymentStatusParamIsCanonical =
    paymentStatus === ""
      ? rawPaymentStatusParam == null
      : rawPaymentStatusParam === paymentStatus;
  const slotParamIsCanonical =
    slot === "" ? rawSlotParam == null : rawSlotParam === slot;
  const normalizedTagIdsParam = currentUrlTagIds.join(",");
  const localTagIdsParam = tagIds.join(",");
  const tagIdsParamIsCanonical =
    localTagIdsParam === "" ? rawTagIdsParam == null : rawTagIdsParam === localTagIdsParam;
  const startDateParamIsCanonical =
    period === "custom"
      ? rawStartDateParam === customStartDate
      : rawStartDateParam == null;
  const endDateParamIsCanonical =
    period === "custom" ? rawEndDateParam === customEndDate : rawEndDateParam == null;

  if (
    normalizedSearch === currentSearch &&
    currentUrlPage === effectivePage &&
    currentUrlPeriod === period &&
    currentUrlStatus === status &&
    currentUrlPaymentStatus === paymentStatus &&
    currentUrlSlot === slot &&
    normalizedTagIdsParam === localTagIdsParam &&
    pageParamIsCanonical &&
    periodParamIsCanonical &&
    statusParamIsCanonical &&
    paymentStatusParamIsCanonical &&
    slotParamIsCanonical &&
    tagIdsParamIsCanonical &&
    startDateParamIsCanonical &&
    endDateParamIsCanonical
  ) {
    return null;
  }

  const params = new URLSearchParams(searchParams.toString());

  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  } else {
    params.delete("search");
  }

  if (
    normalizedSearch !== currentSearch ||
    period !== currentUrlPeriod ||
    status !== currentUrlStatus ||
    paymentStatus !== currentUrlPaymentStatus ||
    slot !== currentUrlSlot ||
    localTagIdsParam !== normalizedTagIdsParam ||
    (period === "custom" &&
      (customStartDate !== (rawStartDateParam ?? "") ||
        customEndDate !== (rawEndDateParam ?? "")))
  ) {
    params.delete("page");
  } else if (effectivePage > 1) {
    params.set("page", String(effectivePage));
  } else {
    params.delete("page");
  }

  if (period === defaultPeriod) {
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

  if (tagIds.length > 0) {
    params.set("tag_ids", tagIds.join(","));
  } else {
    params.delete("tag_ids");
  }

  if (period === "custom" && customStartDate && customEndDate) {
    params.set("start_date", customStartDate);
    params.set("end_date", customEndDate);
  } else {
    params.delete("start_date");
    params.delete("end_date");
  }

  return params.toString() ? `${pathname}?${params.toString()}` : pathname;
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
  tagLabel,
  onClear,
  mode = "operational",
}: Readonly<{
  searchTerm: string;
  periodLabel: string;
  statusLabel?: string;
  paymentStatusLabel?: string;
  slotLabel?: string;
  tagLabel?: string;
  onClear?: () => void;
  mode?: OrderRecordMode;
}>) {
  const modeConfig = getOrderRecordModeConfig(mode);
  const filterParts = [
    periodLabel,
    statusLabel ? `estado ${statusLabel}` : "",
    paymentStatusLabel ? `pagamento ${paymentStatusLabel}` : "",
    slotLabel ? `slot ${slotLabel}` : "",
    tagLabel ? `tags ${tagLabel}` : "",
  ].filter(Boolean);

  const filterSummary = filterParts.join(", ");

  return (
    <EmptyState
      title={modeConfig.emptyStateTitle({ filterSummary, searchTerm })}
      description={modeConfig.emptyStateDescription({ filterSummary, searchTerm })}
      action={
        searchTerm.trim().length > 0 && onClear ? (
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
  onOpenWithdrawal,
  onStatusChange,
  onPaymentStatusChange,
  onPrintOrder,
  isUpdatingStatus,
  isUpdatingPaymentStatus,
  printState = "ready",
  printErrorMessage,
  statusLabels,
  timeZone,
  mode = "operational",
  historyLoading = false,
  historyError = false,
  isRefetching = false,
  onRefetch,
}: Readonly<{
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditOrder?: (order: Order) => void;
  onOpenWithdrawal?: (order: Order) => void;
  onStatusChange?: (nextStatus: string) => void;
  onPaymentStatusChange?: (nextStatus: keyof typeof ORDER_PAYMENT_STATUS_LABELS) => void;
  onPrintOrder?: (order: Order) => void;
  isUpdatingStatus?: boolean;
  isUpdatingPaymentStatus?: boolean;
  printState?: PrintFlowState;
  printErrorMessage?: string | null;
  statusLabels?: Record<string, string>;
  timeZone?: string;
  mode?: OrderRecordMode;
  historyLoading?: boolean;
  historyError?: boolean;
  isRefetching?: boolean;
  onRefetch?: () => Promise<void>;
}>) {
  const modeConfig = getOrderRecordModeConfig(mode);
  const availableTransitions = order
    ? getAllowedOrderStatusTransitions(order.status)
    : [];
  const canOpenWithdrawal = canOrderRegisterPartialWithdrawal(order);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <SheetTitle className="text-xl">
                {modeConfig.detailTitle(order?.id ?? null)}
              </SheetTitle>
              {order && (
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {buildOperationalStatusLabel(order, statusLabels)}
                  </div>
                  {onRefetch && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => onRefetch().catch(() => {})}
                      disabled={isRefetching}
                      title="Revalidar estado"
                    >
                      <RefreshCcw
                        className={cn(
                          "h-3.5 w-3.5",
                          isRefetching && "animate-spin",
                        )}
                        aria-hidden
                      />
                      <span className="sr-only">Revalidar estado</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
            <SheetDescription>
              {modeConfig.detailDescription}
            </SheetDescription>
            {order && modeConfig.showStatusActions ? (
              <div className="mt-3 space-y-3">
                {availableTransitions.length > 0 ? (
                  <div className="space-y-2">
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
                          disabled={Boolean(isUpdatingStatus || isUpdatingPaymentStatus)}
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
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Atualizar pagamento
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ORDER_PAYMENT_STATUS_LABELS).map(([nextStatus, label]) => (
                      <Button
                        key={nextStatus}
                        type="button"
                        variant={
                          order.paymentStatus === nextStatus ? "default" : "outline"
                        }
                        size="sm"
                        disabled={
                          order.paymentStatus === nextStatus ||
                          Boolean(isUpdatingStatus || isUpdatingPaymentStatus)
                        }
                        onClick={() =>
                          onPaymentStatusChange?.(
                            nextStatus as keyof typeof ORDER_PAYMENT_STATUS_LABELS,
                          )
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  {isUpdatingPaymentStatus ? (
                    <p className="text-xs text-muted-foreground">
                      A atualizar estado do pagamento...
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </SheetHeader>
          <SheetClose />
        </div>

        <div className={cn("flex-1 overflow-y-auto px-5 py-5 space-y-6", isRefetching && "opacity-50 pointer-events-none transition-opacity")}>
          {order ? (
            <>
              {order.parentOrderId ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-medium">Encomenda derivada</p>
                  <p className="mt-1">
                    Esta encomenda foi gerada a partir da encomenda mãe #
                    {order.parentOrder?.id ?? order.parentOrderId} e não permite novas retiradas.
                  </p>
                </div>
              ) : null}

              {modeConfig.showEditBlockedNotice && order.canEdit === false && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <p className="font-medium">Esta encomenda já não permite correções</p>
                  <p className="mt-1 opacity-90">
                    O estado atual &quot;{buildOperationalStatusLabel(order, statusLabels)}&quot; bloqueia correções aos dados da encomenda.
                  </p>
                </div>
              )}

              {order.parentOrderId == null && buildPartialWithdrawalStatusSummary(order) ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-medium">Retirada parcial já registada</p>
                  <p className="mt-1">
                    {buildPartialWithdrawalStatusSummary(order)?.totalUnits} unidades em{" "}
                    {buildPartialWithdrawalStatusSummary(order)?.totalWithdrawals} agendamento(s).
                  </p>
                </div>
              ) : null}

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
                              {item.originalUnits != null ? (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Registado: {item.originalUnits} unid. · Saldo:{" "}
                                  {item.remainingUnits ?? item.originalUnits} unid.
                                </p>
                              ) : null}
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

              {order.parentOrderId == null ? (
                <section className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Retiradas parciais
                      </p>
                      <p className="text-sm text-foreground">
                        Registe retiradas em blocos de 25 unidades e, se necessário, gere a encomenda operacional derivada.
                      </p>
                    </div>
                    {canOpenWithdrawal && onOpenWithdrawal ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenWithdrawal(order)}
                      >
                        Retirada
                      </Button>
                    ) : null}
                  </div>

                  {!canOpenWithdrawal ? (
                    <p className="text-sm text-muted-foreground">
                      Esta encomenda não tem itens com saldo elegível para retirada parcial.
                    </p>
                  ) : null}

                  {(order.partialWithdrawals ?? []).length > 0 ? (
                    <div className="space-y-3">
                      {(order.partialWithdrawals ?? []).map((withdrawal) => (
                        <div
                          key={String(withdrawal.id)}
                          className="rounded-xl border border-border/70 bg-background/80 p-4 text-sm"
                        >
                          <p className="font-medium text-foreground">
                            {withdrawal.requestedUnits} unidades ·{" "}
                            {formatOperationalDateTime(withdrawal.scheduledAt, timeZone)}
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            Estado: {withdrawal.status}
                            {withdrawal.generatedOrderId
                              ? ` · encomenda derivada #${withdrawal.generatedOrderId}`
                              : ""}
                          </p>
                          {buildWithdrawalFlavorSummary(withdrawal) ? (
                            <p className="mt-1 text-muted-foreground">
                              Sabores: {buildWithdrawalFlavorSummary(withdrawal)}
                            </p>
                          ) : null}
                          {withdrawal.notes?.trim() ? (
                            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                              {withdrawal.notes}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Ainda não existem retiradas parciais registadas para esta encomenda.
                    </p>
                  )}
                </section>
              ) : null}

              {mode === "investigation" ? (
                <OrderAuditContext
                  order={order}
                  statusLabels={statusLabels}
                  timeZone={timeZone}
                  loading={historyLoading}
                  error={historyError}
                />
              ) : null}

              {modeConfig.showPrintAction ? (
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
              ) : null}

              <OrderHistoryList
                history={order.history}
                order={order}
                timeZone={timeZone}
                statusLabels={statusLabels}
                loading={historyLoading}
                error={historyError}
              />
            </>
          ) : null}
        </div>

        {order ? (
          <div className="border-t border-border/70 bg-card/30 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {order.createdAt
                ? `Criada em ${formatOperationalDateTime(order.createdAt, timeZone)}`
                : "Registo sem timestamp de criação."}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {modeConfig.showEditAction && onEditOrder ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={order.canEdit === false}
                  onClick={() => onEditOrder(order)}
                >
                  Corrigir encomenda
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PartialWithdrawalModal({
  order,
  open,
  onOpenChange,
  productCatalog,
  timeZone,
  onSubmit,
}: Readonly<{
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productCatalog?: OrderProductOption[];
  timeZone?: string;
  onSubmit: (
    order: Order,
    input: {
      parentOrderItemId: number;
      requestedUnits: number;
      flavorIds?: number[];
      date: string;
      time: string;
      allowScheduleException: boolean;
      generateChildOrder: boolean;
      notes: string;
    },
  ) => Promise<void>;
}>) {
  const eligibleWithdrawalItems = React.useMemo(
    () =>
      (order?.items ?? []).filter(
        (item) => item.canWithdrawPartially && (item.remainingUnits ?? 0) >= 25,
      ),
    [order?.items],
  );
  const [withdrawalItemId, setWithdrawalItemId] = React.useState<string>("");
  const [withdrawalUnits, setWithdrawalUnits] = React.useState("25");
  const [withdrawalDate, setWithdrawalDate] = React.useState("");
  const [withdrawalTime, setWithdrawalTime] = React.useState("");
  const [withdrawalNotes, setWithdrawalNotes] = React.useState("");
  const [withdrawalFlavorCounts, setWithdrawalFlavorCounts] = React.useState<Record<number, number>>({});
  const [allowScheduleException, setAllowScheduleException] = React.useState(false);
  const [generateChildOrder, setGenerateChildOrder] = React.useState(true);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = React.useState(false);
  const [withdrawalError, setWithdrawalError] = React.useState<string | null>(null);
  const selectedWithdrawalItem = React.useMemo(
    () => eligibleWithdrawalItems.find((item) => String(item.id) === withdrawalItemId) ?? null,
    [eligibleWithdrawalItems, withdrawalItemId],
  );
  const selectedWithdrawalProduct = React.useMemo(
    () =>
      productCatalog?.find(
        (product) => product.id === selectedWithdrawalItem?.productId,
      ) ?? null,
    [productCatalog, selectedWithdrawalItem?.productId],
  );
  const withdrawalAllowedFlavors = selectedWithdrawalProduct?.allowedFlavors ?? [];
  const parsedWithdrawalUnits = Number(withdrawalUnits);
  const requiredWithdrawalFlavorCount = React.useMemo(
    () =>
      resolveRequiredWithdrawalFlavorCount(
        selectedWithdrawalItem ?? undefined,
        selectedWithdrawalProduct,
        Number.isFinite(parsedWithdrawalUnits) ? parsedWithdrawalUnits : 0,
      ),
    [parsedWithdrawalUnits, selectedWithdrawalItem, selectedWithdrawalProduct],
  );
  const selectedWithdrawalFlavorTotal = React.useMemo(
    () => Object.values(withdrawalFlavorCounts).reduce((total, current) => total + current, 0),
    [withdrawalFlavorCounts],
  );

  React.useEffect(() => {
    if (!open || !order) {
      setWithdrawalItemId("");
      setWithdrawalUnits("25");
      setWithdrawalDate("");
      setWithdrawalTime("");
      setWithdrawalNotes("");
      setWithdrawalFlavorCounts({});
      setAllowScheduleException(false);
      setGenerateChildOrder(true);
      setWithdrawalError(null);
      return;
    }

    const firstItem = eligibleWithdrawalItems[0];

    setWithdrawalItemId(firstItem?.id != null ? String(firstItem.id) : "");
    setWithdrawalUnits("25");
    setWithdrawalDate(getDateInputValue(order.scheduledAt, timeZone));
    setWithdrawalTime(getTimeInputValue(order.scheduledAt, timeZone));
    setWithdrawalNotes("");
    setWithdrawalFlavorCounts({});
    setAllowScheduleException(false);
    setGenerateChildOrder(true);
    setWithdrawalError(null);
  }, [eligibleWithdrawalItems, open, order, timeZone]);

  React.useEffect(() => {
    setWithdrawalFlavorCounts({});
  }, [requiredWithdrawalFlavorCount, selectedWithdrawalItem?.id]);

  function handleWithdrawalFlavorChange(flavorId: number, nextValue: number) {
    const safeValue = Math.max(0, nextValue);
    const currentValue = withdrawalFlavorCounts[flavorId] ?? 0;
    const nextTotal = selectedWithdrawalFlavorTotal - currentValue + safeValue;

    if (requiredWithdrawalFlavorCount > 0 && nextTotal > requiredWithdrawalFlavorCount) {
      return;
    }

    setWithdrawalFlavorCounts((current) => ({
      ...current,
      [flavorId]: safeValue,
    }));
  }

  if (!open || !order) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Retirada parcial
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Encomenda #{order.id} · {buildCustomerLabel(order)}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Item da encomenda mãe</label>
              <Select
                value={withdrawalItemId || undefined}
                onValueChange={(value) => setWithdrawalItemId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar item" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleWithdrawalItems.map((item) => (
                    <SelectItem key={String(item.id)} value={String(item.id)}>
                      {buildPartialWithdrawalItemLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="withdrawal-units">
                Quantidade
              </label>
              <Input
                id="withdrawal-units"
                type="number"
                step={25}
                min={25}
                value={withdrawalUnits}
                onChange={(event) => setWithdrawalUnits(event.currentTarget.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="withdrawal-date">
                Data
              </label>
              <Input
                id="withdrawal-date"
                type="date"
                value={withdrawalDate}
                onChange={(event) => setWithdrawalDate(event.currentTarget.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="withdrawal-time">
                Hora
              </label>
              <Input
                id="withdrawal-time"
                type="time"
                value={withdrawalTime}
                onChange={(event) => setWithdrawalTime(event.currentTarget.value)}
              />
            </div>

            {requiredWithdrawalFlavorCount > 0 ? (
              <div className="space-y-3 md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-950">
                      Sabores da retirada
                    </p>
                    <p className="text-sm text-slate-600">
                      Selecione exatamente {requiredWithdrawalFlavorCount} sabor(es) para esta retirada.
                    </p>
                  </div>
                  <div className="text-sm font-medium text-slate-950">
                    {selectedWithdrawalFlavorTotal} de {requiredWithdrawalFlavorCount}
                  </div>
                </div>

                {withdrawalAllowedFlavors.length > 0 ? (
                  <div className="space-y-3">
                    {withdrawalAllowedFlavors.map((flavor) => (
                      <div
                        key={flavor.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3"
                      >
                        <p className="font-medium text-slate-950">{flavor.name}</p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleWithdrawalFlavorChange(
                                flavor.id,
                                (withdrawalFlavorCounts[flavor.id] ?? 0) - 1,
                              )
                            }
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm font-medium text-slate-950">
                            {withdrawalFlavorCounts[flavor.id] ?? 0}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleWithdrawalFlavorChange(
                                flavor.id,
                                (withdrawalFlavorCounts[flavor.id] ?? 0) + 1,
                              )
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-amber-700">
                    Este artigo ainda não tem sabores disponíveis no catálogo carregado.
                  </p>
                )}
              </div>
            ) : null}

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="withdrawal-notes">
                Notas
              </label>
              <Textarea
                id="withdrawal-notes"
                className="min-h-20"
                value={withdrawalNotes}
                onChange={(event) => setWithdrawalNotes(event.currentTarget.value)}
              />
            </div>

            <label className="md:col-span-2 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={allowScheduleException}
                onChange={(event) => setAllowScheduleException(event.currentTarget.checked)}
              />
              <div className="space-y-1">
                <span className="text-sm font-medium text-slate-950">
                  Permitir exceção fora do horário da loja
                </span>
                <p className="text-sm text-slate-600">
                  Use apenas para lançamentos retroativos ou retiradas alinhadas manualmente. Esta opção ignora horário de funcionamento e antecedência mínima.
                </p>
              </div>
            </label>

            <label className="md:col-span-2 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={generateChildOrder}
                onChange={(event) => setGenerateChildOrder(event.currentTarget.checked)}
              />
              <div className="space-y-1">
                <span className="text-sm font-medium text-slate-950">
                  Gerar encomenda operacional derivada
                </span>
                <p className="text-sm text-slate-600">
                  Quando ativa, a retirada cria também uma encomenda filha ligada à mãe para entrar no quadro operacional.
                </p>
              </div>
            </label>

            {withdrawalError ? (
              <p className="md:col-span-2 text-sm font-medium text-destructive">
                {withdrawalError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSubmittingWithdrawal}
            onClick={async () => {
              const selectedFlavorIds = flattenFlavorCounts(withdrawalFlavorCounts);

              if (!selectedWithdrawalItem?.id) {
                setWithdrawalError("Selecione o item da encomenda mãe.");
                return;
              }

              if (!Number.isFinite(parsedWithdrawalUnits) || parsedWithdrawalUnits < 25 || parsedWithdrawalUnits % 25 !== 0) {
                setWithdrawalError("A retirada parcial deve ser registada em múltiplos de 25 unidades.");
                return;
              }

              if ((selectedWithdrawalItem.remainingUnits ?? 0) < parsedWithdrawalUnits) {
                setWithdrawalError("A quantidade pedida excede o saldo disponível para este item.");
                return;
              }

              if (
                requiredWithdrawalFlavorCount > 0 &&
                selectedWithdrawalFlavorTotal !== requiredWithdrawalFlavorCount
              ) {
                setWithdrawalError(
                  `Selecione exatamente ${requiredWithdrawalFlavorCount} sabor(es) para a retirada.`,
                );
                return;
              }

              if (!withdrawalDate || !withdrawalTime) {
                setWithdrawalError("Defina a data e a hora da retirada.");
                return;
              }

              setIsSubmittingWithdrawal(true);
              setWithdrawalError(null);

              try {
                await onSubmit(order, {
                  parentOrderItemId: Number(selectedWithdrawalItem.id),
                  requestedUnits: parsedWithdrawalUnits,
                  flavorIds: selectedFlavorIds,
                  date: withdrawalDate,
                  time: withdrawalTime,
                  allowScheduleException,
                  generateChildOrder,
                  notes: withdrawalNotes,
                });
                onOpenChange(false);
              } catch (error) {
                setWithdrawalError(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível registar a retirada parcial.",
                );
              } finally {
                setIsSubmittingWithdrawal(false);
              }
            }}
          >
            {isSubmittingWithdrawal ? "A registar..." : "Guardar retirada"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OrdersOperationalRecordContent({
  orders,
  meta,
  searchSlot,
  onOpenOrder,
  onOpenWithdrawal,
  onPrintOrder,
  onPageChange,
  statusLabels,
  timeZone,
  mode: _mode = "operational",
  viewMode = "list",
}: Readonly<{
  orders: Order[];
  meta?: { current_page?: number; last_page?: number; total?: number };
  searchSlot?: React.ReactNode;
  onOpenOrder?: (order: Order) => void;
  onOpenWithdrawal?: (order: Order) => void;
  onPrintOrder?: (order: Order) => void;
  onPageChange?: (page: number) => void;
  statusLabels?: Record<string, string>;
  timeZone?: string;
  mode?: OrderRecordMode;
  viewMode?: "list" | "cards";
}>) {
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;
  const totalRecords = meta?.total ?? orders.length;
  const allowWithdrawalActions = _mode === "operational";

  return (
    <section className="space-y-4">
      {searchSlot}

      <OrdersOperationalRecordTotal total={totalRecords} />

      {viewMode === "list" ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Fila detalhada
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Data/Hora de agendamento</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Estado do pagamento</TableHead>
                <TableHead>Estado operacional</TableHead>
                <TableHead>Quantidade total de itens</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-slate-50/80">
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>{buildCustomerLabel(order)}</TableCell>
                  <TableCell>{order.store?.name ?? "Loja não carregada"}</TableCell>
                  <TableCell>{formatOperationalDateTime(order.scheduledAt, timeZone)}</TableCell>
                  <TableCell>{buildSlotLabel(order)}</TableCell>
                  <TableCell>
                    {(order.tags ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(order.tags ?? []).map(renderOrderTagBadge)}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Sem tags</span>
                    )}
                  </TableCell>
                  <TableCell>{buildPaymentLabel(order)}</TableCell>
                  <TableCell>{buildOperationalStatusLabel(order, statusLabels)}</TableCell>
                  <TableCell>{buildItemsQuantity(order)}</TableCell>
                  <TableCell>{formatTotal(order.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {allowWithdrawalActions && canOrderRegisterPartialWithdrawal(order) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenWithdrawal?.(order)}
                        >
                          Retirada
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onPrintOrder?.(order)}
                      >
                        <Printer className="size-4" />
                        Imprimir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenOrder?.(order)}
                      >
                        Abrir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <article
              key={`card-${order.id}`}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-950">
                    Encomenda #{order.id} ·
                  </p>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>
                      <span className="font-medium text-slate-950">Nome:</span>{" "}
                      {buildCustomerLabel(order)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-950">Tel:</span>{" "}
                      {formatCustomerContact(order.customerContact)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-950">Data/Hora:</span>{" "}
                      {formatScheduledAtDetailed(order.scheduledAt, timeZone)}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(order.tags ?? []).length > 0 ? (
                        (order.tags ?? []).map(renderOrderTagBadge)
                      ) : (
                        <span className="text-xs text-slate-500">Sem tags</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {allowWithdrawalActions && canOrderRegisterPartialWithdrawal(order) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenWithdrawal?.(order)}
                    >
                      Retirada
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPrintOrder?.(order)}
                  >
                    <Printer className="size-4" />
                    Imprimir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenOrder?.(order)}
                  >
                    Abrir
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {buildPartialWithdrawalStatusSummary(order) ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-medium">Retirada parcial registada</p>
                    <p className="mt-1">
                      {buildPartialWithdrawalStatusSummary(order)?.totalUnits} unidades em{" "}
                      {buildPartialWithdrawalStatusSummary(order)?.totalWithdrawals} agendamento(s).
                    </p>
                  </div>
                ) : null}

                {order.items.map((item, index) => {
                  const flavorSummary = buildFlavorSummary(item);

                  return (
                    <div
                      key={buildOrderItemKey(item, index)}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <p className="font-medium text-slate-950">
                        {buildOrderCardItemTitle(item)}
                      </p>

                      {flavorSummary ? (
                        <div className="mt-2 space-y-1 text-sm text-slate-700">
                          {flavorSummary.split(", ").map((flavor) => (
                            <p key={flavor}>* {flavor}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">
                          Quantidade: {item.quantity}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-950">Valor:</span>{" "}
                  {formatTotal(order.total)}
                </p>
                <p className="whitespace-pre-line text-slate-600">
                  {order.notes?.trim() || "Sem notas operacionais persistidas."}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {lastPage > 1 ? (
        <div className="flex justify-end rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
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
        </div>
      ) : null}
    </section>
  );
}

export function OrdersOperationalRecord({
  mode = "operational",
}: Readonly<{
  mode?: OrderRecordMode;
}>) {
  const modeConfig = getOrderRecordModeConfig(mode);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const urlSearchTerm = searchParams.get("search") ?? "";
  const currentPage = normalizeOrderSearchPage(searchParams.get("page"));
  const currentPeriod = normalizeOrderOperationalPeriod(
    searchParams.get("period"),
    modeConfig.defaultPeriod,
  );
  const rawUrlStatus = searchParams.get("status");
  const rawUrlPaymentStatus = searchParams.get("payment_status");
  const rawUrlSlot = searchParams.get("slot");
  const rawUrlTagIds = searchParams.get("tag_ids");
  const rawUrlStartDate = searchParams.get("start_date") ?? "";
  const rawUrlEndDate = searchParams.get("end_date") ?? "";
  const currentSearch = searchParams.get("search") ?? "";
  const rawCurrentStatus = rawUrlStatus?.trim() ?? "";
  const rawCurrentPaymentStatus = rawUrlPaymentStatus?.trim() ?? "";
  const rawCurrentSlot = rawUrlSlot?.trim() ?? "";
  const rawCurrentTagIds = React.useMemo(
    () => normalizeOrderOperationalTagIds(rawUrlTagIds),
    [rawUrlTagIds],
  );
  const [searchInput, setSearchInput] = React.useState(urlSearchTerm);
  const [searchTerm, setSearchTerm] = React.useState(urlSearchTerm);
  const [period, setPeriod] = React.useState<OrderOperationalPeriod>(currentPeriod);
  const [status, setStatus] = React.useState(rawUrlStatus?.trim() ?? "");
  const [paymentStatus, setPaymentStatus] = React.useState(rawUrlPaymentStatus?.trim() ?? "");
  const [slot, setSlot] = React.useState(rawUrlSlot?.trim() ?? "");
  const [tagIds, setTagIds] = React.useState<number[]>(rawCurrentTagIds);
  const [customStartDate, setCustomStartDate] = React.useState(rawUrlStartDate);
  const [customEndDate, setCustomEndDate] = React.useState(rawUrlEndDate);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [filtersHydrated, setFiltersHydrated] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [withdrawalOrder, setWithdrawalOrder] = React.useState<Order | null>(null);
  const [printStateByOrderId, setPrintStateByOrderId] = React.useState<
    Record<string, PrintFlowState>
  >({});
  const [printErrorByOrderId, setPrintErrorByOrderId] = React.useState<
    Record<string, string | null>
  >({});
  const [viewMode, setViewMode] = React.useState<"list" | "cards">("list");
  const printAttemptByOrderIdRef = React.useRef<Record<string, string | null>>({});
  const detailQuery = useOrderDetail(selectedOrder?.id ?? null);
  const productsQuery = useOrderProducts();
  const createPartialWithdrawalMutation = useCreateOrderPartialWithdrawal();
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const updateOrderMutation = useUpdateOrder();
  const normalizedSearchTerm = searchTerm.trim();
  const optimisticFiltersChanged =
    normalizedSearchTerm !== currentSearch ||
    period !== currentPeriod ||
    status !== rawCurrentStatus ||
    paymentStatus !== rawCurrentPaymentStatus ||
    slot !== rawCurrentSlot ||
    tagIds.join(",") !== rawCurrentTagIds.join(",") ||
    (period === "custom" &&
      (customStartDate !== rawUrlStartDate || customEndDate !== rawUrlEndDate));
  const effectivePage = optimisticFiltersChanged ? 1 : currentPage;
  const { data, isLoading, error, isFetching, retry, settings, settingsError, statusOptions } =
    useOrderSearch({
      search: normalizedSearchTerm,
      period,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      slot: slot || undefined,
      tagIds,
      customStartDate: period === "custom" ? customStartDate : undefined,
      customEndDate: period === "custom" ? customEndDate : undefined,
      page: effectivePage,
    });
  const currentStatus = normalizeOrderOperationalStatus(
    rawUrlStatus,
    settings?.statusLabels,
  );
  const currentPaymentStatus = normalizeOrderOperationalPaymentStatus(rawUrlPaymentStatus);
  const currentSlot = normalizeOrderOperationalSlot(rawUrlSlot);
  const currentTagIds = React.useMemo(
    () => normalizeOrderOperationalTagIds(rawUrlTagIds),
    [rawUrlTagIds],
  );
  const statusLabels = React.useMemo(() => settings?.statusLabels, [settings?.statusLabels]);
  const availableTags = React.useMemo(
    () => settings?.availableTags ?? [],
    [settings?.availableTags],
  );

  const selectedStatusLabel = status
    ? statusOptions.find((option) => option.value === status)?.label ?? status
    : undefined;
  const selectedPaymentStatusLabel = paymentStatus
    ? ORDER_PAYMENT_STATUS_LABELS[paymentStatus as keyof typeof ORDER_PAYMENT_STATUS_LABELS] ?? paymentStatus
    : undefined;
  const selectedSlotLabel = slot
    ? ORDER_SLOT_LABELS[slot as keyof typeof ORDER_SLOT_LABELS] ?? slot
    : undefined;
  const selectedTagsLabel =
    tagIds.length > 0
      ? availableTags
          .filter((tag) => tagIds.includes(tag.id))
          .map((tag) => tag.name)
          .join(", ")
      : undefined;
  const selectedOrderDetail = detailQuery.data ?? selectedOrder;
  const activeWithdrawalOrder = React.useMemo(() => {
    if (!withdrawalOrder) {
      return null;
    }

    if (selectedOrderDetail && selectedOrderDetail.id === withdrawalOrder.id) {
      return selectedOrderDetail;
    }

    return withdrawalOrder;
  }, [selectedOrderDetail, withdrawalOrder]);

  // Sync URL to Local State (Only on mount or URL change)
  React.useEffect(() => {
    setSearchInput(urlSearchTerm);
    setSearchTerm(urlSearchTerm);
    setPeriod(currentPeriod);
    setStatus(currentStatus);
    setPaymentStatus(currentPaymentStatus);
    setSlot(currentSlot);
    setTagIds(currentTagIds);
    setCustomStartDate(rawUrlStartDate);
    setCustomEndDate(rawUrlEndDate);
  }, [
    currentPeriod,
    currentStatus,
    currentPaymentStatus,
    currentSlot,
    currentTagIds,
    rawUrlEndDate,
    rawUrlStartDate,
    urlSearchTerm,
  ]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const filtersStorageKey = buildOrderRecordFiltersStorageKey(mode);
    const stored = window.localStorage.getItem(ORDER_RECORD_VIEW_MODE_STORAGE_KEY);
    const storedFiltersOpen = window.localStorage.getItem(
      ORDER_RECORD_FILTERS_OPEN_STORAGE_KEY,
    );
    const hasExplicitFilters = hasExplicitOrderFilterParams(searchParams);
    const persistedFilters = parsePersistedOrderRecordFilters(
      window.localStorage.getItem(filtersStorageKey),
      modeConfig.defaultPeriod,
    );

    if (stored === "list" || stored === "cards") {
      setViewMode(stored);
    }

    if (storedFiltersOpen === "true") {
      setFiltersOpen(true);
    }

    if (!hasExplicitFilters && persistedFilters) {
      setSearchInput(persistedFilters.searchTerm);
      setSearchTerm(persistedFilters.searchTerm);
      setPeriod(persistedFilters.period);
      setStatus(persistedFilters.status);
      setPaymentStatus(persistedFilters.paymentStatus);
      setSlot(persistedFilters.slot);
      setTagIds(persistedFilters.tagIds);
      setCustomStartDate(persistedFilters.customStartDate);
      setCustomEndDate(persistedFilters.customEndDate);
    }

    setFiltersHydrated(true);
  }, [mode, modeConfig.defaultPeriod, searchParams]);

  React.useEffect(() => {
    if (!filtersHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      buildOrderRecordFiltersStorageKey(mode),
      JSON.stringify({
        searchTerm,
        period,
        status,
        paymentStatus,
        slot,
        tagIds,
        customStartDate,
        customEndDate,
      } satisfies PersistedOrderRecordFilters),
    );
  }, [
    customEndDate,
    customStartDate,
    filtersHydrated,
    mode,
    paymentStatus,
    period,
    searchTerm,
    slot,
    status,
    tagIds,
  ]);

  const updateViewMode = React.useCallback((nextMode: "list" | "cards") => {
    setViewMode(nextMode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ORDER_RECORD_VIEW_MODE_STORAGE_KEY, nextMode);
    }
  }, []);

  const toggleFiltersOpen = React.useCallback(() => {
    setFiltersOpen((current) => {
      const nextValue = !current;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          ORDER_RECORD_FILTERS_OPEN_STORAGE_KEY,
          String(nextValue),
        );
      }

      return nextValue;
    });
  }, []);

  // Sync Local State to URL (Debounced/Controlled)
  React.useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    // Wait for settings to load if we have a status to normalize
    // This prevents wiping URL params if settings fetch is slow
    if (rawUrlStatus && !settings) {
      return;
    }

    const nextUrl = buildOrdersRecordUrl({
      pathname,
      searchParams,
      normalizedSearch: normalizedSearchTerm,
      effectivePage,
      period,
      customStartDate,
      customEndDate,
      defaultPeriod: modeConfig.defaultPeriod,
      status,
      paymentStatus,
      slot,
      tagIds,
      statusLabels,
    });

    if (nextUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [
    currentSearch,
    customEndDate,
    customStartDate,
    effectivePage,
    modeConfig.defaultPeriod,
    normalizedSearchTerm,
    pathname,
    period,
    router,
    searchParams,
    settings,
    statusLabels,
    status,
    paymentStatus,
    slot,
    tagIds,
    filtersHydrated,
    rawUrlStatus,
  ]);

  const clearSearch = React.useCallback(() => {
    setSearchInput("");
    setSearchTerm("");
  }, []);

  const submitSearch = React.useCallback(() => {
    const normalizedValue = searchInput.trim();

    setSearchInput(normalizedValue);
    setSearchTerm(normalizedValue);
  }, [searchInput]);

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

      if (nextPeriod === "custom") {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: settings?.timezone ?? "Europe/Lisbon",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

        setCustomStartDate((current) => current || today);
        setCustomEndDate((current) => current || today);
      }
    },
    [settings?.timezone],
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

  const toggleTagFilter = React.useCallback((tagId: number) => {
    setTagIds((current) =>
      current.includes(tagId)
        ? current.filter((currentTagId) => currentTagId !== tagId)
        : [...current, tagId],
    );
  }, []);

  const updateCustomStartDate = React.useCallback((nextValue: string) => {
    setCustomStartDate(nextValue);
    setPeriod("custom");
  }, []);

  const updateCustomEndDate = React.useCallback((nextValue: string) => {
    setCustomEndDate(nextValue);
    setPeriod("custom");
  }, []);

  const clearFilters = React.useCallback(() => {
    setSearchInput("");
    setSearchTerm("");
    setPeriod(modeConfig.defaultPeriod);
    setStatus("");
    setPaymentStatus("");
    setSlot("");
    setTagIds([]);
    setCustomStartDate("");
    setCustomEndDate("");

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(buildOrderRecordFiltersStorageKey(mode));
    }
  }, [mode, modeConfig.defaultPeriod]);

  const retryLoading = React.useCallback(() => {
    void retry();
  }, [retry]);

  React.useEffect(() => {
    if (!modeConfig.showPrintAction) {
      return;
    }

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
  }, [modeConfig.showPrintAction, toast]);

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

  const handlePaymentStatusChange = React.useCallback(
    (nextPaymentStatus: keyof typeof ORDER_PAYMENT_STATUS_LABELS) => {
      const currentOrder = detailQuery.data ?? selectedOrder;

      if (!currentOrder) {
        return;
      }

      const date = getDateInputValue(currentOrder.scheduledAt, settings?.timezone);
      const time = getTimeInputValue(currentOrder.scheduledAt, settings?.timezone);
      const customerContact = currentOrder.customerContact?.trim() ?? "";

      if (
        !currentOrder.store?.id ||
        !currentOrder.customerName?.trim() ||
        !customerContact ||
        !date ||
        !time ||
        !currentOrder.slot
      ) {
        toast(
          "Esta encomenda não tem dados completos para atualizar apenas o pagamento por este atalho.",
          "error",
        );
        return;
      }

      updateOrderMutation.mutate(
        {
          orderId: currentOrder.id,
          timeZone: settings?.timezone,
          input: {
            storeId: currentOrder.store.id,
            customerName: currentOrder.customerName.trim(),
            customerContact,
            tagIds: (currentOrder.tags ?? []).map((tag) => tag.id),
            items: currentOrder.items.map((item) => ({
              parentOrderItemId: item.parentOrderItemId ?? null,
              productId: item.productId,
              quantity: item.quantity,
              variantId: item.variantId ?? null,
              flavorIds: item.flavorIds ?? [],
            })),
            observations: currentOrder.notes ?? "",
            date,
            time,
            slot: currentOrder.slot,
            paymentStatus: nextPaymentStatus,
          },
        },
        {
          onError: (error: Error) => {
            toast(
              error.message || "Não foi possível atualizar o estado do pagamento.",
              "error",
            );
          },
          onSuccess: (updatedOrder) => {
            setSelectedOrder(updatedOrder);
            toast("Estado do pagamento atualizado.", "success");
          },
        },
      );
    },
    [detailQuery.data, selectedOrder, settings?.timezone, toast, updateOrderMutation],
  );

  const handleOpenWithdrawal = React.useCallback((order: Order) => {
    setWithdrawalOrder(order);
  }, []);

  const handleCreatePartialWithdrawal = React.useCallback(
    async (
      order: Order,
      input: {
        parentOrderItemId: number;
        requestedUnits: number;
        flavorIds?: number[];
        date: string;
        time: string;
        allowScheduleException: boolean;
        generateChildOrder: boolean;
        notes: string;
      },
    ) => {
      const isSelectedOrder =
        (detailQuery.data?.id != null && detailQuery.data.id === order.id) ||
        (selectedOrder?.id != null && selectedOrder.id === order.id);

      const result = await createPartialWithdrawalMutation.mutateAsync({
        orderId: order.id,
        timeZone: settings?.timezone,
        input,
      });

      if (isSelectedOrder) {
        setSelectedOrder(result.parentOrder);
      }

      toast(
        result.generatedOrder
          ? `Retirada registada e encomenda derivada #${result.generatedOrder.id} criada.`
          : "Retirada parcial registada.",
        "success",
      );

      if (isSelectedOrder) {
        await detailQuery.refetch();
      }
    },
    [createPartialWithdrawalMutation, detailQuery, selectedOrder, settings?.timezone, toast],
  );

  const handleRefetch = React.useCallback(async () => {
    if (!selectedOrder || detailQuery.isFetching) return;

    const snapshot = detailQuery.data || selectedOrder;

    try {
      const result = await detailQuery.refetch();

      if (result.isError) {
        const error = result.error as Error & { response?: { status: number } };
        if (error?.response?.status === 404) {
          if (window.confirm(REVALIDATE_MESSAGES.errorNotFound)) {
            setSelectedOrder(null);
          }
        } else {
          toast(
            `${REVALIDATE_MESSAGES.errorPrefix} ${error?.message || REVALIDATE_MESSAGES.errorUnknown}`,
            "error",
          );
        }
        return;
      }

      const updatedOrder = result.data;
      if (!updatedOrder) return;

      const changes: string[] = [];

      if (snapshot.status !== updatedOrder.status) {
        const from =
          settings?.statusLabels?.[snapshot.status] || snapshot.status;
        const to =
          settings?.statusLabels?.[updatedOrder.status] || updatedOrder.status;
        changes.push(`${REVALIDATE_MESSAGES.fieldState}: ${from} -> ${to}`);
      }

      if (snapshot.paymentStatus !== updatedOrder.paymentStatus) {
        const from = snapshot.paymentStatus
          ? ORDER_PAYMENT_STATUS_LABELS[snapshot.paymentStatus] || snapshot.paymentStatus
          : "N/A";
        const to = updatedOrder.paymentStatus
          ? ORDER_PAYMENT_STATUS_LABELS[updatedOrder.paymentStatus] || updatedOrder.paymentStatus
          : "N/A";
        changes.push(`${REVALIDATE_MESSAGES.fieldPayment}: ${from} -> ${to}`);
      }

      if (snapshot.scheduledAt !== updatedOrder.scheduledAt) {
        changes.push(REVALIDATE_MESSAGES.fieldSchedule);
      }

      if (changes.length > 0) {
        toast(`${REVALIDATE_MESSAGES.successPrefix} ${changes.join(", ")}`, "success");
      } else {
        toast(REVALIDATE_MESSAGES.infoNoChanges, "info");
      }
    } catch {
      toast(REVALIDATE_MESSAGES.errorGeneric, "error");
    }
  }, [selectedOrder, detailQuery, toast, setSelectedOrder, settings?.statusLabels]);

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
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          {isFetching ? (
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              A atualizar
            </span>
          ) : null}
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <Button
              type="button"
              variant={filtersOpen ? "default" : "ghost"}
              size="icon-sm"
              className="size-8"
              aria-label="Mostrar filtros"
              onClick={toggleFiltersOpen}
            >
              <Filter className="size-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon-sm"
              className="size-8"
              aria-label="Exibir em lista"
              onClick={() => updateViewMode("list")}
            >
              <List className="size-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="icon-sm"
              className="size-8"
              aria-label="Exibir em blocos"
              onClick={() => updateViewMode("cards")}
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      {filtersOpen ? (
        <>
          <OrderSearch
            value={searchInput}
            onChange={setSearchInput}
            onSubmit={submitSearch}
            onClear={clearSearch}
            loading={isFetching}
            label={modeConfig.searchLabel}
            placeholder={modeConfig.searchPlaceholder}
            helpTextIdle={modeConfig.searchHelpIdle}
            helpTextLoading={modeConfig.searchHelpLoading}
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tags</label>
            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = tagIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagFilter(tag.id)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-opacity"
                      style={{
                        backgroundColor: isSelected ? tag.color : "#FFFFFF",
                        borderColor: tag.color,
                        color: isSelected ? buildTagTextColor(tag.color) : "#0F172A",
                        opacity: tag.active || isSelected ? 1 : 0.55,
                      }}
                    >
                      <span
                        className="inline-flex h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: isSelected ? buildTagTextColor(tag.color) : tag.color,
                        }}
                        aria-hidden
                      />
                      {tag.name}
                      {!tag.active ? " · inativa" : ""}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem tags operacionais disponíveis.
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
          {period === "custom" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="custom-start-date">
                  Data inicial
                </label>
                <Input
                  id="custom-start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(event) => updateCustomStartDate(event.currentTarget.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="custom-end-date">
                  Data final
                </label>
                <Input
                  id="custom-end-date"
                  type="date"
                  min={customStartDate || undefined}
                  value={customEndDate}
                  onChange={(event) => updateCustomEndDate(event.currentTarget.value)}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        {modeConfig.loadingMessage}
      </section>
    );
  }

  if (error || settingsError) {
    return (
      <section className="space-y-4">
        {filters}
        <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p>{modeConfig.loadErrorMessage}</p>
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

  const recordContent =
    orders.length === 0 ? (
      <section className="space-y-4">
        {filters}
        <OrdersOperationalRecordTotal total={data?.meta?.total ?? 0} />
        <OrdersOperationalRecordEmptyState
          searchTerm={normalizedSearchTerm}
          periodLabel={ORDER_OPERATIONAL_PERIOD_LABELS[period]}
          statusLabel={selectedStatusLabel}
          paymentStatusLabel={selectedPaymentStatusLabel}
          slotLabel={selectedSlotLabel}
          tagLabel={selectedTagsLabel}
          onClear={clearSearch}
          mode={mode}
        />
      </section>
    ) : (
      <OrdersOperationalRecordContent
        orders={orders}
        meta={data?.meta}
        searchSlot={filters}
        onOpenOrder={setSelectedOrder}
        onOpenWithdrawal={handleOpenWithdrawal}
        onPrintOrder={handlePrintOrder}
        onPageChange={updatePage}
        statusLabels={settings?.statusLabels}
        timeZone={settings?.timezone}
        mode={mode}
        viewMode={viewMode}
      />
    );

  return (
    <>
      {recordContent}
      <OrderDetailSheet
        order={selectedOrderDetail}
        open={selectedOrder !== null}
        isUpdatingStatus={updateOrderStatusMutation.isPending}
        isUpdatingPaymentStatus={updateOrderMutation.isPending}
        onStatusChange={handleStatusChange}
        onOpenWithdrawal={handleOpenWithdrawal}
        onPaymentStatusChange={handlePaymentStatusChange}
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
        mode={mode}
        historyLoading={
          Boolean(selectedOrder) &&
          (detailQuery.isLoading || (detailQuery.isFetching && !detailQuery.data))
        }
        historyError={Boolean(detailQuery.error) && !detailQuery.data}
        isRefetching={detailQuery.isFetching}
        onRefetch={handleRefetch}
        onEditOrder={(order) => {
          setSelectedOrder(null);
          router.push(`/orders/${encodeURIComponent(String(order.id))}/edit`);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
          }
        }}
      />
      <PartialWithdrawalModal
        order={activeWithdrawalOrder}
        open={withdrawalOrder !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWithdrawalOrder(null);
          }
        }}
        productCatalog={productsQuery.data?.data ?? []}
        timeZone={settings?.timezone}
        onSubmit={handleCreatePartialWithdrawal}
      />
    </>
  );
}
