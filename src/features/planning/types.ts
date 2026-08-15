import type { Order } from "@/features/orders/types";

export type PlanningView = "day" | "week" | "period" | "rules";
export type PlanningPeriodStatus = "ready" | "incomplete" | "invalid";

export type PlanningSummary = {
  orderCount: number;
  itemQuantity: number;
  paidCount: number;
  attentionCount: number;
  slotCounts: Record<string, number>;
  preparationSummary?: Record<string, PlanningPreparationSummary>;
};

export type PlanningPreparationSummary = {
  scheduledSlot: string;
  totalPreparationTimeSeconds: number;
  maxPreparationTimeSeconds: number;
  allocationsCount: number;
  preparationSlots: Array<{
    id: number;
    name: string;
    preparationTimeSeconds: number;
    batches: number;
    units: number;
  }>;
};

export type PlanningSlotOccupancyState =
  | "disponível"
  | "limitado"
  | "bloqueado";

export type PlanningSlotOccupancyContextStatus =
  | "official"
  | "insufficient_context"
  | "not_applicable";

export type PlanningSlotOccupancyEntry = {
  count: number;
  label: string;
  state: PlanningSlotOccupancyState | null;
  contextStatus: PlanningSlotOccupancyContextStatus | null;
  contextReason: string | null;
  preparation?: PlanningPreparationSummary | null;
};

export type PlanningSlotOccupancy = Record<string, PlanningSlotOccupancyEntry>;

export type PlanningDaySummary = PlanningSummary & {
  label: string;
  slotOccupancy: PlanningSlotOccupancy;
};

export type DailyPlanningFilters = {
  day: string;
};

export type WeeklyPlanningFilters = {
  weekStart: string;
};

export type PeriodPlanningFilters = {
  startDate: string;
  endDate: string;
};

export type DailyPlanningResponse = {
  orders: Order[];
  filters: DailyPlanningFilters;
  slotLabels: Record<string, string>;
  selectedDayLabel: string;
  summary: PlanningSummary | null;
  slotOccupancy: PlanningSlotOccupancy;
};

export type WeeklyPlanningResponse = {
  orders: Order[];
  filters: WeeklyPlanningFilters;
  slotLabels: Record<string, string>;
  selectedWeekLabel: string;
  summary: PlanningSummary | null;
  slotOccupancy: PlanningSlotOccupancy;
  daySummaries: Record<string, PlanningDaySummary>;
};

export type PeriodPlanningResponse = {
  orders: Order[];
  filters: PeriodPlanningFilters;
  slotLabels: Record<string, string>;
  selectedPeriodLabel: string;
  summary: PlanningSummary | null;
  slotOccupancy: PlanningSlotOccupancy;
  daySummaries: Record<string, PlanningDaySummary>;
};

export type SlotCapacityConfigEntry = {
  slot: string;
  label: string;
  value: number;
};

export type SlotCapacityConfigResponse = {
  scope: "global";
  settingKey: string;
  slotMode?: "periodo" | "horario";
  slotCapacities: SlotCapacityConfigEntry[];
};

export type SlotCapacityConfigInput = Record<string, number>;

export type PlanningSlotOperationalRules = {
  lead_times: Record<string, number>;
  blocked_dates: Array<{
    date: string;
    slots: string[];
  }>;
};

export type PlanningSlotOperationalRulesResponse = {
  scope: "global";
  settingKey: string;
  slotMode?: "periodo" | "horario";
  slots: Array<{
    slot: string;
    label: string;
    start: number;
    end: number;
  }>;
  rules: PlanningSlotOperationalRules;
};
