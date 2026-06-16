import {
  ORDER_PAYMENT_STATUS_LABELS,
  type Order,
} from "@/features/orders/types";

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
  title: string;
  flavorLines: string[];
};

export type ThermalPrintOrder = {
  idLabel: string;
  statusLabel: string;
  customerLabel: string;
  contactLabel: string;
  scheduledAtLabel: string;
  paymentLabel: string;
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

function formatCustomerContact(value?: string | null) {
  if (!value) {
    return "Sem contacto registado";
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

  const normalizedWeekday =
    {
      "segunda-feira": "Seg",
      "terça-feira": "Ter",
      "quarta-feira": "Qua",
      "quinta-feira": "Qui",
      "sexta-feira": "Sex",
      sábado: "Sáb",
      domingo: "Dom",
    }[weekday.toLowerCase()] ?? weekday.replace(".", "");

  return `${normalizedWeekday} ${date} às ${time}`;
}

function buildPrintItemTitle(item: Order["items"][number]) {
  if (item.variantName?.trim()) {
    return item.variantName.trim();
  }

  if (item.quantity > 1) {
    return `${item.productName} x${item.quantity}`;
  }

  return item.productName;
}

function inferPackFlavorSlots(item: Order["items"][number]) {
  const variantName = item.variantName?.trim();

  if (!variantName) {
    return null;
  }

  const unitMatch = variantName.match(/(\d+)/);

  if (!unitMatch) {
    return null;
  }

  const units = Number(unitMatch[1]);

  if (!Number.isFinite(units) || units < 25 || units % 25 !== 0) {
    return null;
  }

  return units / 25;
}

function buildFlavorLines(item: Order["items"][number]) {
  if (item.flavorNames && item.flavorNames.length > 0) {
    const inferredSlots = inferPackFlavorSlots(item);

    if (item.flavorNames.length === 1 && inferredSlots && inferredSlots > 1) {
      return Array.from({ length: inferredSlots }, () => item.flavorNames![0]);
    }

    return item.flavorNames;
  }

  if (item.flavorIds && item.flavorIds.length > 0) {
    const inferredSlots = inferPackFlavorSlots(item);

    if (item.flavorIds.length === 1 && inferredSlots && inferredSlots > 1) {
      return Array.from({ length: inferredSlots }, () => `#${item.flavorIds![0]}`);
    }

    return item.flavorIds.map((id) => `#${id}`);
  }

  return [];
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
    idLabel: `Encomenda #${order.id} ·`,
    statusLabel: options?.statusLabels?.[order.status] ?? order.status,
    customerLabel:
      order.customerName?.trim() || order.user?.name || "Cliente não identificado",
    contactLabel: formatCustomerContact(order.customerContact),
    scheduledAtLabel: formatScheduledAtDetailed(order.scheduledAt, timeZone),
    paymentLabel: order.paymentStatus
      ? (ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus).toUpperCase()
      : "Não definido",
    totalLabel: formatPrintCurrency(order.total),
    notesLabel: order.notes?.trim() || "Sem notas operacionais",
    items: order.items.map((item, index) => ({
      key: String(item.id ?? `${item.productId}-${index}`),
      title: buildPrintItemTitle(item),
      flavorLines: buildFlavorLines(item),
    })),
  };
}
