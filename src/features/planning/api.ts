import { apiClient } from "@/lib/api/http";
import { normalizeOrderResource } from "@/features/orders/api";
import type {
  DailyPlanningResponse,
  PlanningSlotOccupancy,
  PlanningSlotOccupancyEntry,
  PlanningSlotOccupancyContextStatus,
  PlanningSlotOccupancyState,
  PlanningPreparationSummary,
  PeriodPlanningResponse,
  SlotCapacityConfigInput,
  SlotCapacityConfigResponse,
  PlanningSlotOperationalRules,
  PlanningSlotOperationalRulesResponse,
  PlanningSummary,
  WeeklyPlanningResponse,
} from "./types";

type BackendPlanningOrder = {
  id: number;
  status: string;
  can_edit?: boolean;
  payment_status?: "pending" | "partial" | "paid" | null;
  slot?: string | null;
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
  slot_occupancy?: Record<string, Partial<BackendPlanningSlotOccupancyEntry>> | null;
};

type BackendPlanningSlotOccupancyEntry = {
  count?: number;
  label?: string;
  state?: string | null;
  context_status?: string | null;
  context_reason?: string | null;
  preparation?: BackendPlanningPreparationSummary | null;
};

type BackendPlanningPreparationSummary = {
  scheduled_slot?: string;
  total_preparation_time_seconds?: number;
  max_preparation_time_seconds?: number;
  allocations_count?: number;
  preparation_slots?: Array<{
    id?: number;
    name?: string;
    preparation_time_seconds?: number;
    batches?: number;
    units?: number;
  }>;
};

type BackendWeeklyPlanningResponse = {
  data: BackendPlanningOrder[];
  filters?: {
    week_start?: string;
  };
  slot_labels?: Record<string, string>;
  selected_week_label?: string;
  summary?: Partial<PlanningSummary> | null;
  slot_occupancy?: Record<string, Partial<BackendPlanningSlotOccupancyEntry>> | null;
  day_summaries?: Record<string, Partial<BackendPlanningDaySummaryEntry> | null>;
};

type BackendPeriodPlanningResponse = {
  data: BackendPlanningOrder[];
  filters?: {
    start_date?: string;
    end_date?: string;
  };
  slot_labels?: Record<string, string>;
  selected_period_label?: string;
  summary?: Partial<PlanningSummary> | null;
  slot_occupancy?: Record<string, Partial<BackendPlanningSlotOccupancyEntry>> | null;
  day_summaries?: Record<string, Partial<BackendPlanningDaySummaryEntry> | null>;
};

type BackendPlanningDaySummaryEntry = {
  label?: string;
  orderCount?: number;
  itemQuantity?: number;
  paidCount?: number;
  attentionCount?: number;
  slotCounts?: Record<string, number>;
  preparationSummary?: Record<string, BackendPlanningPreparationSummary>;
  preparation_summary?: Record<string, BackendPlanningPreparationSummary>;
  slot_counts?: Record<string, number>;
  slotOccupancy?: Record<string, Partial<BackendPlanningSlotOccupancyEntry>> | null;
  slot_occupancy?: Record<string, Partial<BackendPlanningSlotOccupancyEntry>> | null;
};

type BackendSlotCapacityConfigEntry = {
  slot?: string;
  label?: string;
  value?: number;
};

type BackendSlotCapacityConfigResponse = {
  data?: {
    scope?: "global";
    setting_key?: string;
    slot_mode?: "periodo" | "horario";
    slot_capacities?: BackendSlotCapacityConfigEntry[];
  };
};

type BackendPlanningSlotDefinition = {
  slot?: string;
  label?: string;
  start?: number;
  end?: number;
};

type BackendPlanningSlotOperationalRulesResponse = {
  data?: {
    scope?: "global";
    setting_key?: string;
    slot_mode?: "periodo" | "horario";
    slots?: BackendPlanningSlotDefinition[];
    rules?: {
      lead_times?: Record<string, number>;
      blocked_dates?: Array<{
        date?: string;
        slots?: string[];
      }>;
    };
  };
};

function normalizeSummaryCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizePlanningSlotCounts(slotCounts: Record<string, number> | undefined) {
  if (!slotCounts) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(slotCounts).filter(([, count]) => Number.isFinite(count)),
  );
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
    slotCounts: normalizePlanningSlotCounts(summary.slotCounts),
    ...(summary.preparationSummary ? { preparationSummary: summary.preparationSummary } : {}),
  };
}

function normalizePlanningPreparationSummary(
  summary: BackendPlanningPreparationSummary | null | undefined,
): PlanningPreparationSummary | null {
  if (!summary) {
    return null;
  }

  return {
    scheduledSlot:
      typeof summary.scheduled_slot === "string" ? summary.scheduled_slot : "",
    totalPreparationTimeSeconds: normalizeSummaryCount(summary.total_preparation_time_seconds),
    maxPreparationTimeSeconds: normalizeSummaryCount(summary.max_preparation_time_seconds),
    allocationsCount: normalizeSummaryCount(summary.allocations_count),
    preparationSlots: (summary.preparation_slots ?? []).map((slot) => ({
      id: normalizeSummaryCount(slot.id),
      name: typeof slot.name === "string" ? slot.name : "Cuba",
      preparationTimeSeconds: normalizeSummaryCount(slot.preparation_time_seconds),
      batches: normalizeSummaryCount(slot.batches),
      units: normalizeSummaryCount(slot.units),
    })),
  };
}

function normalizePlanningSlotOccupancyState(
  value: string | null | undefined,
): PlanningSlotOccupancyState | null {
  if (value === "disponível" || value === "limitado" || value === "bloqueado") {
    return value;
  }

  return null;
}

function normalizePlanningSlotOccupancyContextStatus(
  value: string | null | undefined,
  state: PlanningSlotOccupancyState | null,
): PlanningSlotOccupancyContextStatus | null {
  if (
    value === "official" ||
    value === "insufficient_context" ||
    value === "not_applicable"
  ) {
    return value;
  }

  return state ? "official" : null;
}

function normalizePlanningSlotOccupancy(
  occupancy:
    | Record<string, Partial<BackendPlanningSlotOccupancyEntry>>
    | null
    | undefined,
): PlanningSlotOccupancy {
  if (!occupancy) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(occupancy).map(([slot, entry]) => {
      const normalizedEntry =
        entry && typeof entry === "object" ? entry : ({} as Partial<BackendPlanningSlotOccupancyEntry>);
      const state = normalizePlanningSlotOccupancyState(normalizedEntry.state);
      const preparation = normalizePlanningPreparationSummary(normalizedEntry.preparation);

      return [
        slot,
        {
          count: normalizeSummaryCount(normalizedEntry.count),
          label:
            typeof normalizedEntry.label === "string" && normalizedEntry.label.trim() !== ""
              ? normalizedEntry.label
              : slot,
          state,
          contextStatus: normalizePlanningSlotOccupancyContextStatus(
            normalizedEntry.context_status,
            state,
          ),
          contextReason:
            typeof normalizedEntry.context_reason === "string" &&
            normalizedEntry.context_reason.trim() !== ""
              ? normalizedEntry.context_reason
              : null,
          ...(preparation ? { preparation } : {}),
        } satisfies PlanningSlotOccupancyEntry,
      ];
    }),
  );
}

function normalizePlanningDaySummaries(
  daySummaries: Record<string, Partial<BackendPlanningDaySummaryEntry> | null> | undefined,
) {
  if (!daySummaries) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(daySummaries).map(([dayKey, summary]) => {
      const normalizedSummary =
        summary && typeof summary === "object" ? summary : ({} as Partial<BackendPlanningDaySummaryEntry>);

      return [
        dayKey,
        {
          label: normalizedSummary.label ?? dayKey,
          orderCount: normalizeSummaryCount(normalizedSummary.orderCount),
          itemQuantity: normalizeSummaryCount(normalizedSummary.itemQuantity),
          paidCount: normalizeSummaryCount(normalizedSummary.paidCount),
          attentionCount: normalizeSummaryCount(normalizedSummary.attentionCount),
          slotCounts: normalizePlanningSlotCounts(
            normalizedSummary.slot_counts ?? normalizedSummary.slotCounts,
          ),
          slotOccupancy: normalizePlanningSlotOccupancy(
            normalizedSummary.slot_occupancy ?? normalizedSummary.slotOccupancy,
          ),
        },
      ];
    }),
  );
}

function normalizeSlotCapacityEntries(
  entries: BackendSlotCapacityConfigEntry[] | undefined,
): SlotCapacityConfigResponse["slotCapacities"] {
  const normalizedEntries = Array.isArray(entries) ? entries : [];

  return normalizedEntries
    .filter((entry) => typeof entry.slot === "string" && entry.slot.trim() !== "")
    .map((entry) => ({
      slot: entry.slot ?? "",
      label:
        typeof entry.label === "string" && entry.label.trim() !== ""
          ? entry.label
          : entry.slot ?? "",
      value:
        typeof entry.value === "number" && Number.isFinite(entry.value)
          ? entry.value
          : 0,
    }));
}

function normalizeSlotDefinitions(
  entries: BackendPlanningSlotDefinition[] | undefined,
): PlanningSlotOperationalRulesResponse["slots"] {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => typeof entry.slot === "string" && entry.slot.trim() !== "")
    .map((entry) => ({
      slot: entry.slot ?? "",
      label:
        typeof entry.label === "string" && entry.label.trim() !== ""
          ? entry.label
          : entry.slot ?? "",
      start: typeof entry.start === "number" && Number.isFinite(entry.start) ? entry.start : 0,
      end: typeof entry.end === "number" && Number.isFinite(entry.end) ? entry.end : 0,
    }));
}

function normalizeOperationalRules(
  rules: BackendPlanningSlotOperationalRulesResponse["data"],
): PlanningSlotOperationalRules {
  const actualRules = rules?.rules;
  const leadTimes = actualRules?.lead_times && typeof actualRules.lead_times === "object"
    ? Object.fromEntries(
        Object.entries(actualRules.lead_times).map(([slot, value]) => [
          slot,
          typeof value === "number" && Number.isFinite(value) ? value : 0,
        ]),
      )
    : {};

  return {
    lead_times: leadTimes,
    blocked_dates: Array.isArray(actualRules?.blocked_dates)
      ? actualRules.blocked_dates.map((entry) => ({
          date: entry.date ?? "",
          slots: Array.isArray(entry.slots) ? entry.slots : [],
        }))
      : [],
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
    slotOccupancy: normalizePlanningSlotOccupancy(response.data.slot_occupancy),
  };
}

export async function getWeeklyPlanning(
  weekStart: string,
): Promise<WeeklyPlanningResponse> {
  const response = await apiClient.get<BackendWeeklyPlanningResponse>(
    "/admin/orders/weekly",
    {
      params: {
        week_start: weekStart,
      },
    },
  );
  const normalizedOrders = response.data.data.map(normalizeOrderResource);

  return {
    orders: normalizedOrders,
    filters: {
      weekStart: response.data.filters?.week_start ?? weekStart,
    },
    slotLabels: response.data.slot_labels ?? {},
    selectedWeekLabel: response.data.selected_week_label ?? weekStart,
    summary: normalizePlanningSummary(response.data.summary),
    slotOccupancy: normalizePlanningSlotOccupancy(response.data.slot_occupancy),
    daySummaries: normalizePlanningDaySummaries(response.data.day_summaries),
  };
}

export async function getSlotCapacityConfig(): Promise<SlotCapacityConfigResponse> {
  const response = await apiClient.get<BackendSlotCapacityConfigResponse>(
    "/admin/planning/slot-capacities",
  );

  return {
    scope: response.data.data?.scope ?? "global",
    settingKey: response.data.data?.setting_key ?? "ORDER_SLOT_BASE_CAPACITY",
    ...(response.data.data?.slot_mode ? { slotMode: response.data.data.slot_mode } : {}),
    slotCapacities: normalizeSlotCapacityEntries(response.data.data?.slot_capacities),
  };
}

export async function updateSlotCapacityConfig(
  input: SlotCapacityConfigInput,
): Promise<SlotCapacityConfigResponse> {
  const response = await apiClient.put<BackendSlotCapacityConfigResponse>(
    "/admin/planning/slot-capacities",
    input,
  );

  return {
    scope: response.data.data?.scope ?? "global",
    settingKey: response.data.data?.setting_key ?? "ORDER_SLOT_BASE_CAPACITY",
    ...(response.data.data?.slot_mode ? { slotMode: response.data.data.slot_mode } : {}),
    slotCapacities: normalizeSlotCapacityEntries(response.data.data?.slot_capacities),
  };
}

export async function getOperationalRules(): Promise<PlanningSlotOperationalRulesResponse> {
  const response = await apiClient.get<BackendPlanningSlotOperationalRulesResponse>(
    "/admin/planning/operational-rules",
  );

  return {
    scope: response.data.data?.scope ?? "global",
    settingKey: response.data.data?.setting_key ?? "ORDER_SLOT_OPERATIONAL_RULES",
    ...(response.data.data?.slot_mode ? { slotMode: response.data.data.slot_mode } : {}),
    slots: normalizeSlotDefinitions(response.data.data?.slots),
    rules: normalizeOperationalRules(response.data.data),
  };
}

export async function updateOperationalRules(
  rules: PlanningSlotOperationalRules,
): Promise<PlanningSlotOperationalRulesResponse> {
  const response = await apiClient.put<BackendPlanningSlotOperationalRulesResponse>(
    "/admin/planning/operational-rules",
    rules,
  );

  return {
    scope: response.data.data?.scope ?? "global",
    settingKey: response.data.data?.setting_key ?? "ORDER_SLOT_OPERATIONAL_RULES",
    ...(response.data.data?.slot_mode ? { slotMode: response.data.data.slot_mode } : {}),
    slots: normalizeSlotDefinitions(response.data.data?.slots),
    rules: normalizeOperationalRules(response.data.data),
  };
}

export async function getPeriodPlanning(
  startDate: string,
  endDate: string,
): Promise<PeriodPlanningResponse> {
  const response = await apiClient.get<BackendPeriodPlanningResponse>(
    "/admin/orders/period",
    {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    },
  );
  const normalizedOrders = response.data.data.map(normalizeOrderResource);

  return {
    orders: normalizedOrders,
    filters: {
      startDate: response.data.filters?.start_date ?? startDate,
      endDate: response.data.filters?.end_date ?? endDate,
    },
    slotLabels: response.data.slot_labels ?? {},
    selectedPeriodLabel:
      response.data.selected_period_label ?? `${startDate} - ${endDate}`,
    summary: normalizePlanningSummary(response.data.summary),
    slotOccupancy: normalizePlanningSlotOccupancy(response.data.slot_occupancy),
    daySummaries: normalizePlanningDaySummaries(response.data.day_summaries),
  };
}
