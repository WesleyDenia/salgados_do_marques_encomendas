import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_SLOT_LABELS,
  type Order,
} from "@/features/orders/types";
import { formatOperationalDateTime } from "@/features/orders/utils/operational-timezone";

export const PRINT_WIDTH_MM = 80;

export type PrintFlowState =
  | "ready"
  | "preparing"
  | "preview"
  | "printing"
  | "success"
  | "error";

export type PrintFlowIntent = "print" | "reprint";

export type OrderPrintFlowEvent = {
  type: "order-print-flow";
  orderId: string;
  attemptId: string;
  intent: PrintFlowIntent;
  state: Extract<PrintFlowState, "preview" | "printing" | "success" | "error">;
  errorMessage?: string | null;
};

export type ThermalPrintItem = {
  key: string;
  productName: string;
  quantity: number;
  totalLabel: string;
  variantName: string | null;
  flavorLabel: string | null;
};

export type ThermalPrintOrder = {
  idLabel: string;
  statusLabel: string;
  customerLabel: string;
  contactLabel: string;
  storeName: string;
  storeAddress: string | null;
  storePhone: string | null;
  scheduledAtLabel: string;
  slotLabel: string;
  paymentLabel: string;
  createdAtLabel: string;
  totalLabel: string;
  notesLabel: string;
  items: ThermalPrintItem[];
};

export function formatPrintCurrency(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function buildOrderPrintHref(
  orderId: string | number,
  options?: {
    attemptId?: string;
    intent?: PrintFlowIntent;
  },
) {
  const path = `/orders/${encodeURIComponent(String(orderId))}/print`;

  if (!options?.attemptId && !options?.intent) {
    return path;
  }

  const params = new URLSearchParams();

  if (options.attemptId) {
    params.set("attemptId", options.attemptId);
  }

  if (options.intent) {
    params.set("intent", options.intent);
  }

  return `${path}?${params.toString()}`;
}

export function openPrintPreviewWindow(
  href: string,
  openWindow: (
    href: string,
    target: string,
    features: string,
  ) => Window | null,
) {
  return openWindow(href, "_blank", "noopener,noreferrer");
}

export function buildOrderPrintAttemptId(orderId: string | number) {
  const prefix = `order-${String(orderId)}`;

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

export function isOrderPrintFlowEvent(value: unknown): value is OrderPrintFlowEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<OrderPrintFlowEvent>;

  return (
    candidate.type === "order-print-flow" &&
    typeof candidate.orderId === "string" &&
    typeof candidate.attemptId === "string" &&
    (candidate.intent === "print" || candidate.intent === "reprint") &&
    (candidate.state === "preview" ||
      candidate.state === "printing" ||
      candidate.state === "success" ||
      candidate.state === "error")
  );
}

function buildFlavorLabel(item: Order["items"][number]) {
  if (item.flavorNames && item.flavorNames.length > 0) {
    return item.flavorNames.join(", ");
  }

  if (item.flavorIds && item.flavorIds.length > 0) {
    return item.flavorIds.map((id) => `#${id}`).join(", ");
  }

  return null;
}

export function toThermalPrintOrder(
  order: Order,
  options?: {
    statusLabels?: Record<string, string>;
    timeZone?: string;
  },
): ThermalPrintOrder {
  const timeZone = options?.timeZone ?? "Europe/Lisbon";

  return {
    idLabel: `Encomenda #${order.id}`,
    statusLabel: options?.statusLabels?.[order.status] ?? order.status,
    customerLabel:
      order.customerName?.trim() || order.user?.name || "Cliente não identificado",
    contactLabel: order.customerContact?.trim() || "Sem contacto registado",
    storeName: order.store?.name ?? "Loja não carregada",
    storeAddress:
      [order.store?.address, order.store?.city].filter(Boolean).join(", ") || null,
    storePhone: order.store?.phone?.trim() || null,
    scheduledAtLabel: formatOperationalDateTime(order.scheduledAt, timeZone),
    slotLabel: order.slot ? (ORDER_SLOT_LABELS[order.slot] ?? order.slot) : "Não definido",
    paymentLabel: order.paymentStatus
      ? (ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus)
      : "Não definido",
    createdAtLabel: formatOperationalDateTime(order.createdAt, timeZone),
    totalLabel: formatPrintCurrency(order.total),
    notesLabel: order.notes?.trim() || "Sem notas operacionais",
    items: order.items.map((item, index) => ({
      key: String(item.id ?? `${item.productId}-${index}`),
      productName: item.productName,
      quantity: item.quantity,
      totalLabel: formatPrintCurrency(item.total),
      variantName: item.variantName?.trim() || null,
      flavorLabel: buildFlavorLabel(item),
    })),
  };
}
