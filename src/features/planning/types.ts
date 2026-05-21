import type { Order } from "@/features/orders/types";

export type PlanningSummary = {
  orderCount: number;
  itemQuantity: number;
  paidCount: number;
  attentionCount: number;
  slotCounts: Record<string, number>;
};

export type DailyPlanningFilters = {
  day: string;
};

export type DailyPlanningResponse = {
  orders: Order[];
  filters: DailyPlanningFilters;
  slotLabels: Record<string, string>;
  selectedDayLabel: string;
  summary: PlanningSummary | null;
};
