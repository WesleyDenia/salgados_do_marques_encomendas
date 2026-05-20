"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getOrders,
  type OrderSearchFilters,
} from "@/features/orders/api";
import {
  orderKeys,
  useOrderSettings,
} from "@/features/orders/hooks/use-order-queries";
import {
  ORDER_PAYMENT_STATUSES,
  ORDER_SLOT_OPTIONS,
} from "@/features/orders/types";
import {
  addDaysToZonedDate,
  getZonedParts,
  zonedDateTimeToUtcDate,
} from "@/features/orders/utils/operational-timezone";

export const ORDER_OPERATIONAL_PERIODS = [
  "today",
  "tomorrow",
  "next-7-days",
  "all",
] as const;

export type OrderOperationalPeriod = (typeof ORDER_OPERATIONAL_PERIODS)[number];

export type OrderSearchState = {
  search: string;
  period: OrderOperationalPeriod;
  status?: string;
  paymentStatus?: string;
  slot?: string;
  page: number;
};

export function normalizeOrderOperationalPeriod(
  value?: string | null,
): OrderOperationalPeriod {
  return ORDER_OPERATIONAL_PERIODS.find((period) => period === value) ?? "today";
}

export function normalizeOrderSearchPage(value?: string | null): number {
  const page = Number(value ?? "1");

  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function normalizeOrderOperationalStatus(
  value?: string | null,
  statusLabels?: Record<string, string>,
) {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    return "";
  }

  if (!statusLabels) {
    return normalizedValue;
  }

  return statusLabels[normalizedValue] ? normalizedValue : "";
}

export function normalizeOrderOperationalPaymentStatus(value?: string | null) {
  const normalizedValue = value?.trim() ?? "";

  return ORDER_PAYMENT_STATUSES.some((s) => s === normalizedValue)
    ? normalizedValue
    : "";
}

export function normalizeOrderOperationalSlot(value?: string | null) {
  const normalizedValue = value?.trim() ?? "";

  return ORDER_SLOT_OPTIONS.some((s) => s === normalizedValue)
    ? normalizedValue
    : "";
}

export async function retryOrderSearchQueries({
  hasSettings,
  refetchSettings,
  refetchOrders,
}: {
  hasSettings: boolean;
  refetchSettings: () => Promise<{ isSuccess?: boolean }>;
  refetchOrders: () => Promise<unknown>;
}) {
  if (hasSettings) {
    return refetchOrders();
  }

  const settingsResult = await refetchSettings();

  if (settingsResult.isSuccess) {
    return refetchOrders();
  }

  return settingsResult;
}

export function buildOperationalPeriodDateRange(
  period: OrderOperationalPeriod,
  timeZone: string,
  now = new Date(),
) {
  if (period === "all") {
    return {};
  }

  const zonedNow = getZonedParts(now, timeZone);
  const today = {
    year: zonedNow.year,
    month: zonedNow.month,
    day: zonedNow.day,
  };

  if (period === "today") {
    return {
      scheduledFrom: zonedDateTimeToUtcDate(
        { ...today, hour: 0, minute: 0, second: 0 },
        timeZone,
      ).toISOString(),
      scheduledTo: zonedDateTimeToUtcDate(
        { ...today, hour: 23, minute: 59, second: 59, millisecond: 999 },
        timeZone,
      ).toISOString(),
    };
  }

  if (period === "tomorrow") {
    const tomorrow = addDaysToZonedDate(today, 1);

    return {
      scheduledFrom: zonedDateTimeToUtcDate(
        { ...tomorrow, hour: 0, minute: 0, second: 0 },
        timeZone,
      ).toISOString(),
      scheduledTo: zonedDateTimeToUtcDate(
        { ...tomorrow, hour: 23, minute: 59, second: 59, millisecond: 999 },
        timeZone,
      ).toISOString(),
    };
  }

  const seventhDay = addDaysToZonedDate(today, 7);

  return {
    scheduledFrom: zonedDateTimeToUtcDate(
      { ...today, hour: 0, minute: 0, second: 0 },
      timeZone,
    ).toISOString(),
    scheduledTo: zonedDateTimeToUtcDate(
      { ...seventhDay, hour: 23, minute: 59, second: 59, millisecond: 999 },
      timeZone,
    ).toISOString(),
  };
}

export function buildOrderSearchFilters(
  state: OrderSearchState,
  timeZone: string,
  now = new Date(),
): OrderSearchFilters {
  const dateRange = buildOperationalPeriodDateRange(state.period, timeZone, now);

  return {
    search: state.search,
    page: state.page,
    status: state.status,
    paymentStatus: state.paymentStatus,
    slot: state.slot,
    scheduledFrom: dateRange.scheduledFrom,
    scheduledTo: dateRange.scheduledTo,
  };
}

export function useOrderSearch(state: OrderSearchState) {
  const settingsQuery = useOrderSettings();
  const normalizedStatus =
    normalizeOrderOperationalStatus(state.status, settingsQuery.data?.statusLabels) ||
    undefined;
  const normalizedPaymentStatus =
    normalizeOrderOperationalPaymentStatus(state.paymentStatus) || undefined;
  const normalizedSlot = normalizeOrderOperationalSlot(state.slot) || undefined;
  const timeZone = settingsQuery.data?.timezone ?? "Europe/Lisbon";
  const filters = buildOrderSearchFilters(
    {
      ...state,
      status: normalizedStatus,
      paymentStatus: normalizedPaymentStatus,
      slot: normalizedSlot,
    },
    timeZone,
  );
  const ordersQuery = useQuery({
    queryKey: orderKeys.search("", 1).concat({
      search: filters.search ?? "",
      period: state.period,
      status: normalizedStatus ?? "",
      paymentStatus: normalizedPaymentStatus ?? "",
      slot: normalizedSlot ?? "",
      page: state.page,
      timeZone,
    }),
    queryFn: () => getOrders(filters),
    enabled: settingsQuery.isSuccess,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  return {
    ...ordersQuery,
    retry: () =>
      retryOrderSearchQueries({
        hasSettings: settingsQuery.isSuccess,
        refetchSettings: settingsQuery.refetch,
        refetchOrders: ordersQuery.refetch,
      }),
    settings: settingsQuery.data,
    settingsError: settingsQuery.error,
    statusOptions: Object.entries(settingsQuery.data?.statusLabels ?? {}).map(
      ([value, label]) => ({
        value,
        label,
      }),
    ),
    isLoading: settingsQuery.isLoading || ordersQuery.isLoading,
    isFetching: settingsQuery.isFetching || ordersQuery.isFetching,
  };
}
