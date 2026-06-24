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
  "custom",
  "all",
] as const;

export type OrderOperationalPeriod = (typeof ORDER_OPERATIONAL_PERIODS)[number];

export type OrderSearchState = {
  search: string;
  period: OrderOperationalPeriod;
  status?: string;
  paymentStatus?: string;
  slot?: string;
  tagIds?: number[];
  customStartDate?: string;
  customEndDate?: string;
  page: number;
};

export function normalizeOrderOperationalPeriod(
  value?: string | null,
  fallback: OrderOperationalPeriod = "today",
): OrderOperationalPeriod {
  return ORDER_OPERATIONAL_PERIODS.find((period) => period === value) ?? fallback;
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

export function normalizeOrderOperationalTagIds(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((tagId) => Number.isInteger(tagId) && tagId > 0);
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
  customStartDate?: string,
  customEndDate?: string,
  now = new Date(),
) {
  if (period === "all") {
    return {};
  }

  if (period === "custom") {
    if (!customStartDate || !customEndDate) {
      return {};
    }

    const [startYear, startMonth, startDay] = customStartDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = customEndDate.split("-").map(Number);

    if (
      !Number.isFinite(startYear) ||
      !Number.isFinite(startMonth) ||
      !Number.isFinite(startDay) ||
      !Number.isFinite(endYear) ||
      !Number.isFinite(endMonth) ||
      !Number.isFinite(endDay)
    ) {
      return {};
    }

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
        { ...today, hour: 23, minute: 59, second: 59 },
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
        { ...tomorrow, hour: 23, minute: 59, second: 59 },
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
      { ...seventhDay, hour: 23, minute: 59, second: 59 },
      timeZone,
    ).toISOString(),
  };
}

export function buildOrderSearchFilters(
  state: OrderSearchState,
  timeZone: string,
  now = new Date(),
): OrderSearchFilters {
  const dateRange = buildOperationalPeriodDateRange(
    state.period,
    timeZone,
    state.customStartDate,
    state.customEndDate,
    now,
  );

  return {
    search: state.search,
    page: state.page,
    status: state.status,
    paymentStatus: state.paymentStatus,
    slot: state.slot,
    tagIds: state.tagIds,
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
  const normalizedTagIds = Array.isArray(state.tagIds)
    ? state.tagIds.filter((tagId) => Number.isInteger(tagId) && tagId > 0)
    : undefined;
  const timeZone = settingsQuery.data?.timezone ?? "Europe/Lisbon";
  const filters = buildOrderSearchFilters(
    {
      ...state,
      status: normalizedStatus,
      paymentStatus: normalizedPaymentStatus,
      slot: normalizedSlot,
      tagIds: normalizedTagIds,
    },
    timeZone,
  );
  const ordersQuery = useQuery({
    queryKey: orderKeys.search({
      search: filters.search ?? "",
      period: state.period,
      status: normalizedStatus ?? "",
      paymentStatus: normalizedPaymentStatus ?? "",
      slot: normalizedSlot ?? "",
      tagIds: normalizedTagIds?.join(",") ?? "",
      customStartDate: state.customStartDate ?? "",
      customEndDate: state.customEndDate ?? "",
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
