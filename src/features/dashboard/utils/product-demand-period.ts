import {
  addDaysToZonedDate,
  getZonedParts,
} from "@/features/orders/utils/operational-timezone";

export type ProductDemandPeriod = "today" | "tomorrow" | "next-7-days" | "custom";

export const PRODUCT_DEMAND_PERIODS: ProductDemandPeriod[] = [
  "today",
  "tomorrow",
  "next-7-days",
  "custom",
];

export const PRODUCT_DEMAND_PERIOD_LABELS: Record<ProductDemandPeriod, string> = {
  today: "Hoje",
  tomorrow: "Amanhã",
  "next-7-days": "Próximos 7 dias",
  custom: "Data personalizada",
};

export function normalizeProductDemandPeriod(value?: string | null): ProductDemandPeriod {
  return PRODUCT_DEMAND_PERIODS.includes(value as ProductDemandPeriod)
    ? (value as ProductDemandPeriod)
    : "today";
}

export function formatDateInputValue(value: { year: number; month: number; day: number }) {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

export function isValidDateInputValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

export function buildProductDemandDateRange(
  period: ProductDemandPeriod,
  timeZone: string,
  customStartDate: string,
  customEndDate: string,
  now = new Date(),
) {
  if (period === "custom") {
    return {
      startDate: customStartDate,
      endDate: customEndDate,
    };
  }

  const zonedNow = getZonedParts(now, timeZone);
  const today = {
    year: zonedNow.year,
    month: zonedNow.month,
    day: zonedNow.day,
  };

  if (period === "tomorrow") {
    const tomorrow = formatDateInputValue(addDaysToZonedDate(today, 1));

    return {
      startDate: tomorrow,
      endDate: tomorrow,
    };
  }

  if (period === "next-7-days") {
    return {
      startDate: formatDateInputValue(today),
      endDate: formatDateInputValue(addDaysToZonedDate(today, 7)),
    };
  }

  const date = formatDateInputValue(today);

  return {
    startDate: date,
    endDate: date,
  };
}
