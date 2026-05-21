"use client";

import {
  getZonedParts,
  zonedDateTimeToUtcDate,
} from "@/features/orders/utils/operational-timezone";
import type { Order } from "@/features/orders/types";
import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_SLOT_LABELS,
} from "@/features/orders/types";
import type { DailyPlanningResponse } from "@/features/planning/types";

export type PlanningSlotContext =
  | {
      status: "ready";
      storeId: number;
      storeName: string;
    }
  | {
      status: "empty";
      reason: string;
    }
  | {
      status: "mixed";
      reason: string;
    };

function isValidPlanningDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function normalizePlanningDay(
  value: string | null | undefined,
  timeZone: string,
  now = new Date(),
) {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (isValidPlanningDay(trimmedValue)) {
      return trimmedValue;
    }
  }

  const parts = getZonedParts(now, timeZone);

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function normalizePlanningStoreId(value: string | null | undefined) {
  const parsed = Number(value ?? "");

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export function buildPlanningDayDateRange(
  day: string,
  timeZone: string,
) {
  const [year, month, date] = day.split("-").map(Number);

  return {
    scheduledFrom: zonedDateTimeToUtcDate(
      {
        year,
        month,
        day: date,
        hour: 0,
        minute: 0,
        second: 0,
      },
      timeZone,
    ).toISOString(),
    scheduledTo: zonedDateTimeToUtcDate(
      {
        year,
        month,
        day: date,
        hour: 23,
        minute: 59,
        second: 59,
      },
      timeZone,
    ).toISOString(),
  };
}

export function getPreferredPlanningStoreId(
  stores: Array<{ id: number; defaultStore: boolean }> | undefined,
) {
  if (!stores?.length) {
    return 0;
  }

  return (stores.find((store) => store.defaultStore) ?? stores[0]).id;
}

export function resolvePlanningSlotContext(
  data: DailyPlanningResponse,
): PlanningSlotContext {
  if (data.orders.length === 0) {
    return {
      status: "empty",
      reason: "Sem encomendas no dia selecionado para pedir contexto oficial de slots.",
    };
  }

  const storeMap = new Map<number, string>();

  for (const order of data.orders) {
    if (order.store?.id && order.store.name) {
      storeMap.set(order.store.id, order.store.name);
    }
  }

  if (storeMap.size === 0) {
    return {
      status: "empty",
      reason: "As encomendas do dia não trazem loja suficiente para consultar os estados oficiais de slot.",
    };
  }

  if (storeMap.size > 1) {
    return {
      status: "mixed",
      reason: "O dia inclui encomendas de várias lojas; o estado oficial de slots só é mostrado quando o conjunto pertence a uma única loja.",
    };
  }

  const [storeId, storeName] = Array.from(storeMap.entries())[0];

  return {
    status: "ready",
    storeId,
    storeName,
  };
}

export function buildPlanningCustomerLabel(order: Order) {
  return order.customerName ?? order.user?.name ?? "Cliente não identificado";
}

export function buildPlanningPaymentLabel(order: Order) {
  if (!order.paymentStatus) {
    return "Não definido";
  }

  return ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus;
}

export function buildPlanningSlotLabel(order: Order) {
  if (!order.slot) {
    return "Sem slot";
  }

  return ORDER_SLOT_LABELS[order.slot] ?? order.slot;
}

export function buildPlanningLoadLabel(order: Order) {
  const items = order.items.reduce((total, item) => total + item.quantity, 0);
  const totalLabel =
    typeof order.total === "number"
      ? new Intl.NumberFormat("pt-PT", {
          style: "currency",
          currency: "EUR",
        }).format(order.total)
      : "-";

  return `${items} itens · ${totalLabel}`;
}
