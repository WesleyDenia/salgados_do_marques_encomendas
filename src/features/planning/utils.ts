"use client";

import {
  addDaysToZonedDate,
  getDateInputValueInTimeZone,
  getZonedParts,
  zonedDateTimeToUtcDate,
} from "@/features/orders/utils/operational-timezone";
import type { Order } from "@/features/orders/types";
import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_SLOT_LABELS,
} from "@/features/orders/types";
import type {
  PlanningDaySummary,
  PlanningSlotOccupancy,
  PlanningPeriodStatus,
  PlanningView,
  PeriodPlanningResponse,
  WeeklyPlanningResponse,
} from "@/features/planning/types";

export const PLANNING_SLOT_ORDER = [
  "manha",
  "tarde",
  "noite",
  "sem_slot",
] as const;

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

function shiftIsoDateByDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day + days));

  return `${String(candidate.getUTCFullYear()).padStart(4, "0")}-${String(candidate.getUTCMonth() + 1).padStart(2, "0")}-${String(candidate.getUTCDate()).padStart(2, "0")}`;
}

function normalizeOptionalPlanningDay(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  return isValidPlanningDay(trimmedValue) ? trimmedValue : "";
}

function getPlanningIsoWeekday(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const isoWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return isoWeekday === 0 ? 7 : isoWeekday;
}

function capitalizePlanningLabel(value: string) {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

function humanizePlanningSlotKey(value: string) {
  return capitalizePlanningLabel(value.replaceAll("_", " "));
}

function getPlanningDayDifference(left: string, right: string) {
  const [leftYear, leftMonth, leftDay] = left.split("-").map(Number);
  const [rightYear, rightMonth, rightDay] = right.split("-").map(Number);
  const leftDate = Date.UTC(leftYear, leftMonth - 1, leftDay);
  const rightDate = Date.UTC(rightYear, rightMonth - 1, rightDay);

  return Math.round((leftDate - rightDate) / 86_400_000);
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

export function normalizePlanningView(value: string | null | undefined): PlanningView {
  if (value === "week" || value === "period") {
    return value;
  }

  return "day";
}

export function normalizePlanningWeekStart(
  value: string | null | undefined,
  timeZone: string,
  now = new Date(),
) {
  const normalizedDay = normalizePlanningDay(value, timeZone, now);
  const isoWeekday = getPlanningIsoWeekday(normalizedDay);

  return shiftIsoDateByDays(normalizedDay, 1 - isoWeekday);
}

export function isPlanningDayWithinWeek(day: string, weekStart: string) {
  const difference = getPlanningDayDifference(day, weekStart);

  return difference >= 0 && difference < 7;
}

export function buildPlanningDayFromWeekStart(
  currentDay: string,
  currentWeekStart: string,
  nextWeekStart: string,
) {
  const offset = isPlanningDayWithinWeek(currentDay, currentWeekStart)
    ? getPlanningDayDifference(currentDay, currentWeekStart)
    : 0;

  return shiftIsoDateByDays(nextWeekStart, offset);
}

export function resolvePlanningPeriodState(
  viewValue: string | null | undefined,
  dayValue: string | null | undefined,
  weekStartValue: string | null | undefined,
  startDateOrTimeZone: string | null | undefined,
  endDateOrNow?: string | Date | null,
  timeZoneOrNow?: string | Date,
  maybeNow = new Date(),
) {
  const usesExpandedSignature = typeof timeZoneOrNow === "string";
  const startDateValue = usesExpandedSignature ? startDateOrTimeZone : null;
  const endDateValue = usesExpandedSignature
    ? typeof endDateOrNow === "string"
      ? endDateOrNow
      : null
    : null;
  const timeZone = usesExpandedSignature
    ? timeZoneOrNow
    : typeof startDateOrTimeZone === "string"
      ? startDateOrTimeZone
      : "Europe/Lisbon";
  const now =
    usesExpandedSignature && maybeNow instanceof Date
      ? maybeNow
      : !usesExpandedSignature && endDateOrNow instanceof Date
        ? endDateOrNow
        : new Date();
  const view = normalizePlanningView(viewValue);
  const day = normalizePlanningDay(dayValue, timeZone, now);
  const weekStart = normalizePlanningWeekStart(weekStartValue ?? day, timeZone, now);

  if (view === "period") {
    const normalizedStartDate = normalizeOptionalPlanningDay(startDateValue);
    const normalizedEndDate = normalizeOptionalPlanningDay(endDateValue);
    const startDate =
      normalizedStartDate === "" && normalizedEndDate === "" ? day : normalizedStartDate;
    const endDate =
      normalizedStartDate === "" && normalizedEndDate === "" ? day : normalizedEndDate;

    let periodStatus: PlanningPeriodStatus = "ready";

    if (startDate === "" || endDate === "") {
      periodStatus = "incomplete";
    } else if (getPlanningDayDifference(endDate, startDate) < 0) {
      periodStatus = "invalid";
    }

    return {
      view,
      day,
      weekStart,
      startDate,
      endDate,
      periodStatus,
    };
  }

  if (view === "week") {
    const normalizedDay = isPlanningDayWithinWeek(day, weekStart)
      ? day
      : weekStart;

    return { view, day: normalizedDay, weekStart };
  }

  return {
    view,
    day,
    weekStart: normalizePlanningWeekStart(day, timeZone, now),
  };
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

export function buildPlanningWeekDateRange(
  weekStart: string,
  timeZone: string,
) {
  const [year, month, date] = weekStart.split("-").map(Number);
  const weekEnd = addDaysToZonedDate(
    {
      year,
      month,
      day: date,
    },
    6,
  );

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
        year: weekEnd.year,
        month: weekEnd.month,
        day: weekEnd.day,
        hour: 23,
        minute: 59,
        second: 59,
      },
      timeZone,
    ).toISOString(),
  };
}

export function buildPlanningPeriodDateRange(
  startDate: string,
  endDate: string,
  timeZone: string,
) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  return {
    scheduledFrom: zonedDateTimeToUtcDate(
      {
        year: startYear,
        month: startMonth,
        day: startDay,
        hour: 0,
        minute: 0,
        second: 0,
      },
      timeZone,
    ).toISOString(),
    scheduledTo: zonedDateTimeToUtcDate(
      {
        year: endYear,
        month: endMonth,
        day: endDay,
        hour: 23,
        minute: 59,
        second: 59,
      },
      timeZone,
    ).toISOString(),
  };
}

export function buildPlanningPeriodFromDay(day: string) {
  return {
    startDate: day,
    endDate: day,
  };
}

export function buildPlanningPeriodFromWeekStart(weekStart: string) {
  return {
    startDate: weekStart,
    endDate: shiftIsoDateByDays(weekStart, 6),
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

export function buildPlanningWeekDayKeys(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => shiftIsoDateByDays(weekStart, index));
}

export function formatPlanningWeekdayLabel(dayKey: string, timeZone: string) {
  const labelDate = new Date(`${dayKey}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    weekday: "long",
  }).format(labelDate);
  const dayMonth = new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
  }).format(labelDate);

  return `${capitalizePlanningLabel(weekday)} · ${dayMonth}`;
}

export function buildPlanningWeekOrderGroups(
  data: WeeklyPlanningResponse,
  timeZone: string,
) {
  return buildPlanningOrderGroups(data.daySummaries, data.orders, timeZone);
}

export function buildPlanningPeriodOrderGroups(
  data: PeriodPlanningResponse,
  timeZone: string,
) {
  return buildPlanningOrderGroups(data.daySummaries, data.orders, timeZone);
}

export function buildPlanningOfficialDayGroups(
  daySummaries: Record<string, PlanningDaySummary>,
) {
  return Object.entries(daySummaries)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dayKey, summary]) => ({
      dayKey,
      summary,
    }));
}

function buildPlanningOrderGroups(
  daySummaries: Record<string, PlanningDaySummary>,
  orders: Order[],
  timeZone: string,
) {
  const groupedOrders = new Map<string, Order[]>();

  for (const order of orders) {
    const dayKey = getDateInputValueInTimeZone(order.scheduledAt, timeZone) || "sem-data";
    const currentOrders = groupedOrders.get(dayKey) ?? [];

    currentOrders.push(order);
    groupedOrders.set(dayKey, currentOrders);
  }

  return Object.entries(daySummaries)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dayKey, summary]) => ({
      dayKey,
      summary,
      orders: groupedOrders.get(dayKey) ?? [],
    }))
    .concat(
      Array.from(groupedOrders.entries())
        .filter(([dayKey]) => !daySummaries[dayKey])
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([dayKey, orders]) => ({
          dayKey,
          summary: {
            label:
              dayKey === "sem-data"
                ? "Sem agendamento"
                : formatPlanningWeekdayLabel(dayKey, timeZone),
            orderCount: orders.length,
            itemQuantity: orders.reduce(
              (total, order) =>
                total + order.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
              0,
            ),
            paidCount: orders.filter((order) => order.paymentStatus === "paid").length,
            attentionCount: orders.filter((order) =>
              order.status === "placed" || order.status === "accepted").length,
            slotCounts: {},
            slotOccupancy: {},
          } satisfies PlanningDaySummary,
          orders,
        })),
    );
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

export function buildPlanningSlotCountLabel(
  slot: string,
  slotLabels: Record<string, string>,
) {
  if (slotLabels[slot]) {
    return slotLabels[slot];
  }

  if (slot === "sem_slot") {
    return "Sem slot";
  }

  if (slot in ORDER_SLOT_LABELS) {
    return ORDER_SLOT_LABELS[slot as keyof typeof ORDER_SLOT_LABELS];
  }

  return humanizePlanningSlotKey(slot);
}

export function buildPlanningSlotLoadEntries(
  slotCounts: Record<string, number>,
  slotLabels: Record<string, string>,
) {
  const orderedEntries: Array<{ slot: string; label: string; count: number }> = PLANNING_SLOT_ORDER.filter((slot) =>
    Object.prototype.hasOwnProperty.call(slotCounts, slot),
  ).map((slot) => ({
    slot,
    label: buildPlanningSlotCountLabel(slot, slotLabels),
    count: slotCounts[slot] ?? 0,
  }));

  const extraEntries = Object.entries(slotCounts)
    .filter(
      ([slot]) =>
        !PLANNING_SLOT_ORDER.includes(slot as (typeof PLANNING_SLOT_ORDER)[number]),
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slot, count]) => ({
      slot,
      label: buildPlanningSlotCountLabel(slot, slotLabels),
      count,
    }));

  return orderedEntries.concat(extraEntries);
}

export function buildPlanningSlotOccupancyEntries(
  slotOccupancy: PlanningSlotOccupancy,
  slotLabels: Record<string, string>,
) {
  const orderedEntries: Array<{
    slot: string;
    label: string;
    count: number;
    state: PlanningSlotOccupancy[string]["state"];
    contextStatus: PlanningSlotOccupancy[string]["contextStatus"];
    contextReason: PlanningSlotOccupancy[string]["contextReason"];
    preparation: PlanningSlotOccupancy[string]["preparation"];
  }> = PLANNING_SLOT_ORDER.filter((slot) =>
    Object.prototype.hasOwnProperty.call(slotOccupancy, slot),
  ).map((slot) => {
    const entry = slotOccupancy[slot];

    return {
      slot,
      label:
        (typeof entry?.label === "string" && entry.label.trim() !== ""
          ? entry.label
          : undefined) ?? buildPlanningSlotCountLabel(slot, slotLabels),
      count: entry?.count ?? 0,
      state: entry?.state ?? null,
      contextStatus: entry?.contextStatus ?? null,
      contextReason: entry?.contextReason ?? null,
      preparation: entry?.preparation ?? null,
    };
  });

  const extraEntries = Object.entries(slotOccupancy)
    .filter(
      ([slot]) =>
        !PLANNING_SLOT_ORDER.includes(slot as (typeof PLANNING_SLOT_ORDER)[number]),
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slot, entry]) => ({
      slot,
      label:
        (typeof entry?.label === "string" && entry.label.trim() !== ""
          ? entry.label
          : undefined) ?? buildPlanningSlotCountLabel(slot, slotLabels),
      count: entry?.count ?? 0,
      state: entry?.state ?? null,
      contextStatus: entry?.contextStatus ?? null,
      contextReason: entry?.contextReason ?? null,
      preparation: entry?.preparation ?? null,
    }));

  return orderedEntries.concat(extraEntries);
}

export function hasCompletePlanningSlotCounts(slotCounts: Record<string, number>) {
  return PLANNING_SLOT_ORDER.every((slot) =>
    Object.prototype.hasOwnProperty.call(slotCounts, slot),
  );
}
