import { apiClient } from "@/lib/api/http";
import { normalizeOrderResource } from "@/features/orders/api";
import type { DailyPlanningResponse, PlanningSummary } from "./types";

type BackendPlanningOrder = {
  id: number;
  status: string;
  can_edit?: boolean;
  payment_status?: "pending" | "partial" | "paid" | null;
  slot?: "manha" | "tarde" | "noite" | null;
  customer_name?: string | null;
  customer_contact?: string | null;
  scheduled_at?: string | null;
  total?: number;
  notes?: string | null;
  items?: Array<{
    id: number;
    product_id: number;
    variant_id?: number | null;
    variant_name?: string | null;
    name: string;
    quantity: number;
    total: number;
    options?: {
      flavors?: number[];
      flavor_names?: string[];
    } | null;
  }>;
  store?: {
    id: number;
    name: string;
    city?: string | null;
    address?: string | null;
    phone?: string | null;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at?: string | null;
};

type BackendDailyPlanningResponse = {
  data: BackendPlanningOrder[];
  filters?: {
    day?: string;
  };
  slot_labels?: Record<string, string>;
  selected_day_label?: string;
  summary?: Partial<PlanningSummary> | null;
};

function normalizeSummaryCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizePlanningSummary(
  summary: Partial<PlanningSummary> | null | undefined,
): PlanningSummary | null {
  if (!summary) {
    return null;
  }

  return {
    orderCount: normalizeSummaryCount(summary.orderCount),
    itemQuantity: normalizeSummaryCount(summary.itemQuantity),
    paidCount: normalizeSummaryCount(summary.paidCount),
    attentionCount: normalizeSummaryCount(summary.attentionCount),
    slotCounts: summary.slotCounts ?? {},
  };
}

export async function getDailyPlanning(day: string): Promise<DailyPlanningResponse> {
  const response = await apiClient.get<BackendDailyPlanningResponse>(
    "/admin/orders/daily",
    {
      params: {
        day,
      },
    },
  );
  const normalizedOrders = response.data.data.map(normalizeOrderResource);

  return {
    orders: normalizedOrders,
    filters: {
      day: response.data.filters?.day ?? day,
    },
    slotLabels: response.data.slot_labels ?? {},
    selectedDayLabel: response.data.selected_day_label ?? day,
    summary: normalizePlanningSummary(response.data.summary),
  };
}
