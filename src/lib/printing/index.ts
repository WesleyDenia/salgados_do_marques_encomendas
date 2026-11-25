import { type Order } from "@/features/orders/types";

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
  pickupStoreLabel: string;
  items: ThermalPrintItem[];
  payment?: {
    statusLabel: string;
    paidAmountLabel?: string;
    remainingAmountLabel?: string;
  };
  notesLabel?: string;
  fryingTiming?: {
    startLabel: string;
    finishLabel: string;
    pickupLabel: string;
  };
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
    fryingTiming?: {
      startLabel: string;
      finishLabel: string;
      pickupLabel: string;
    };
  },
) {
  const path = `/orders/${encodeURIComponent(String(orderId))}/print`;

  if (!options?.attemptId && !options?.intent && !options?.fryingTiming) {
    return path;
  }

  const params = new URLSearchParams();

  if (options.attemptId) {
    params.set("attemptId", options.attemptId);
  }

  if (options.intent) {
    params.set("intent", options.intent);
  }

  if (options.fryingTiming) {
    params.set("fryingStart", options.fryingTiming.startLabel);
    params.set("fryingFinish", options.fryingTiming.finishLabel);
    params.set("fryingPickup", options.fryingTiming.pickupLabel);
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

function formatPickupStoreLabel(store?: Order["store"] | null) {
  const storeName = store?.name?.trim();

  return storeName ? storeName.toLocaleUpperCase("pt-PT") : "LOJA NÃO DEFINIDA";
}

function uppercasePrintText(value: string) {
  return value.toLocaleUpperCase("pt-PT");
}

function buildPrintItemTitle(item: Order["items"][number]) {
  if (item.variantName?.trim()) {
    return uppercasePrintText(item.variantName.trim());
  }

  if (item.quantity > 1) {
    return uppercasePrintText(`${item.productName} x${item.quantity}`);
  }

  return uppercasePrintText(item.productName);
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
    const flavorNames = item.flavorNames.map((flavor) => formatPrintFlavor(flavor, item.isFrozen));

    if (flavorNames.length === 1 && inferredSlots && inferredSlots > 1) {
      return Array.from({ length: inferredSlots }, () => flavorNames[0]);
    }

    return flavorNames;
  }

  if (item.flavorIds && item.flavorIds.length > 0) {
    const inferredSlots = inferPackFlavorSlots(item);
    const flavorIds = item.flavorIds.map((id) => formatPrintFlavor(`#${id}`, item.isFrozen));

    if (flavorIds.length === 1 && inferredSlots && inferredSlots > 1) {
      return Array.from({ length: inferredSlots }, () => flavorIds[0]);
    }

    return flavorIds;
  }

  return [];
}

function formatPrintFlavor(flavor: string, isFrozen?: boolean) {
  return uppercasePrintText(isFrozen ? `${flavor} - CONGELADO` : flavor);
}

function buildWithdrawalLines(order: Order, timeZone: string) {
  return (order.partialWithdrawals ?? []).map((withdrawal) => {
    const flavorSummary =
      withdrawal.flavorNames && withdrawal.flavorNames.length > 0
        ? withdrawal.flavorNames.join(", ")
        : withdrawal.flavorIds && withdrawal.flavorIds.length > 0
          ? withdrawal.flavorIds.map((id) => `#${id}`).join(", ")
          : "sabores não informados";

    return `Retirada: ${withdrawal.requestedUnits} unid. · ${formatScheduledAtDetailed(withdrawal.scheduledAt, timeZone)} · ${flavorSummary}`;
  });
}

function buildRemainingWithdrawalUnitsLabel(order: Order) {
  const eligibleItems = order.items.filter(
    (item) => item.canWithdrawPartially || item.originalUnits != null || item.remainingUnits != null,
  );

  if (eligibleItems.length === 0) {
    return null;
  }

  const totalRemainingUnits = eligibleItems.reduce((total, item) => {
    if (typeof item.remainingUnits === "number") {
      return total + Math.max(0, item.remainingUnits);
    }

    if (typeof item.originalUnits === "number") {
      return total + Math.max(0, item.originalUnits - (item.withdrawnUnits ?? 0));
    }

    return total;
  }, 0);

  return `Saldo restante: ${totalRemainingUnits} unid.`;
}

function buildPrintNotesLabel(order: Order, timeZone: string) {
  const baseNotes = order.notes?.trim() || null;
  const withdrawalLines = buildWithdrawalLines(order, timeZone);
  const remainingUnitsLabel = buildRemainingWithdrawalUnitsLabel(order);

  if (withdrawalLines.length === 0) {
    return baseNotes;
  }

  return [
    ...(baseNotes ? [baseNotes] : []),
    "Retiradas parciais:",
    ...(remainingUnitsLabel ? [remainingUnitsLabel] : []),
    ...withdrawalLines,
  ].join("\n");
}

function getPrintPaidAmount(order: Order) {
  const total = Math.max(0, order.total ?? 0);
  const paidAmount = order.paidAmount ?? (order.paymentStatus === "paid" ? total : 0);

  return Math.min(total, Math.max(0, paidAmount));
}

function buildPrintPayment(order: Order): ThermalPrintOrder["payment"] {
  if (!order.paymentStatus) {
    return undefined;
  }

  const paidAmount = getPrintPaidAmount(order);
  const remainingAmount = Math.max(0, (order.total ?? 0) - paidAmount);

  if (order.paymentStatus === "paid") {
    return {
      statusLabel: "Pago",
      paidAmountLabel: formatPrintCurrency(paidAmount),
    };
  }

  if (order.paymentStatus === "partial") {
    return {
      statusLabel: "Parcial",
      paidAmountLabel: formatPrintCurrency(paidAmount),
      remainingAmountLabel: formatPrintCurrency(remainingAmount),
    };
  }

  return {
    statusLabel: "Pendente",
    remainingAmountLabel: formatPrintCurrency(remainingAmount),
  };
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
    customerLabel: uppercasePrintText(
      order.customerName?.trim() || order.user?.name || "Cliente não identificado",
    ),
    contactLabel: formatCustomerContact(order.customerContact),
    scheduledAtLabel: formatScheduledAtDetailed(order.scheduledAt, timeZone),
    pickupStoreLabel: formatPickupStoreLabel(order.store),
    payment: buildPrintPayment(order),
    notesLabel: buildPrintNotesLabel(order, timeZone),
    items: order.items.map((item, index) => ({
      key: String(item.id ?? `${item.productId}-${index}`),
      title: buildPrintItemTitle(item),
      flavorLines: buildFlavorLines(item),
    })),
  };
}
