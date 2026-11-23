import { apiClient } from "@/lib/api/http";
import type {
  CreatePreparationSlotInput,
  DeletePreparationSlotInput,
  DeletePreparationTimeInput,
  FryingPlan,
  PreparationCapacity,
  SavePreparationTimeInput,
  UpdatePreparationSlotInput,
  UpdatePreparationTimeInput,
} from "./types";

type RecordValue = Record<string, unknown>;
const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const optionalText = (value: unknown) => (typeof value === "string" ? value : null);
const array = (value: unknown) => (Array.isArray(value) ? value : []);

function normalizePlan(value: RecordValue): FryingPlan {
  const store = (value.store ?? {}) as RecordValue;
  return {
    date: text(value.date),
    timeZone: text(value.timezone) || "Europe/Lisbon",
    store: { id: number(store.id), name: text(store.name) },
    ordersCount: number(value.orders_count),
    tasksCount: number(value.tasks_count),
    earliestStartAt: optionalText(value.earliest_start_at),
    warnings: array(value.warnings).filter((item): item is string => typeof item === "string"),
    slots: array(value.slots).map((entry) => {
      const slot = entry as RecordValue;
      return {
        id: number(slot.id), name: text(slot.name) || "Cuba", heatingTimeSeconds: number(slot.heating_time_seconds), displayOrder: number(slot.display_order),
        tasks: array(slot.tasks).map((taskEntry) => {
          const task = taskEntry as RecordValue;
          return {
            allocationId: number(task.allocation_id), orderId: number(task.order_id),
            customerName: optionalText(task.customer_name), productName: text(task.product_name),
            batchUnits: number(task.batch_units), preparationTimeSeconds: number(task.preparation_time_seconds), heatingTimeSeconds: number(task.heating_time_seconds),
            pickupAt: optionalText(task.pickup_at), readyBy: optionalText(task.ready_by), heatingStartAt: optionalText(task.heating_start_at),
            startAt: optionalText(task.start_at), finishAt: optionalText(task.finish_at),
          };
        }),
      };
    }),
  };
}

function normalizeCapacity(value: RecordValue): PreparationCapacity {
  return {
    slots: array(value.slots).map((entry) => {
      const slot = entry as RecordValue;
      return { id: number(slot.id), storeId: typeof slot.store_id === "number" ? slot.store_id : null, name: text(slot.name) || "Cuba", heatingTimeSeconds: number(slot.heating_time_seconds), active: Boolean(slot.active), displayOrder: number(slot.display_order) };
    }),
    settings: array(value.settings).map((entry) => {
      const setting = entry as RecordValue;
      return { id: number(setting.id), slotId: number(setting.operational_preparation_slot_id), productId: number(setting.product_id), batchSize: number(setting.batch_size), preparationTimeSeconds: number(setting.preparation_time_seconds) };
    }),
    products: array(value.products).map((entry) => {
      const product = entry as RecordValue;
      return { id: number(product.id), name: text(product.name) };
    }),
  };
}

export async function getFryingPlan(date: string, storeId: number) {
  const response = await apiClient.get<{ data: RecordValue }>("/admin/frying-planning", { params: { date, store_id: storeId } });
  return normalizePlan(response.data.data ?? {});
}

export async function getPreparationCapacity(storeId: number) {
  const response = await apiClient.get<{ data: RecordValue }>("/admin/settings/operational/preparation-capacity", { params: { store_id: storeId } });
  return normalizeCapacity(response.data.data ?? {});
}

export async function createPreparationSlot(input: CreatePreparationSlotInput) {
  await apiClient.post("/admin/settings/operational/preparation-capacity/slots", {
    store_id: input.storeId, name: input.name, heating_minutes: input.heatingMinutes, clone_from_slot_id: input.cloneFromSlotId,
  });
}

export async function savePreparationTime(input: SavePreparationTimeInput) {
  await apiClient.post("/admin/settings/operational/preparation-capacity/times", {
    store_id: input.storeId, operational_preparation_slot_id: input.slotId,
    product_id: input.productId, batch_size: input.batchSize,
    preparation_minutes: input.preparationMinutes,
  });
}

export async function updatePreparationSlot(input: UpdatePreparationSlotInput) {
  await apiClient.put(`/admin/settings/operational/preparation-capacity/slots/${input.slotId}`, {
    store_id: input.storeId,
    name: input.name,
    heating_minutes: input.heatingMinutes,
  });
}

export async function deletePreparationSlot(input: DeletePreparationSlotInput) {
  await apiClient.delete(`/admin/settings/operational/preparation-capacity/slots/${input.slotId}`, {
    data: { store_id: input.storeId },
  });
}

export async function updatePreparationTime(input: UpdatePreparationTimeInput) {
  await apiClient.put(`/admin/settings/operational/preparation-capacity/times/${input.settingId}`, {
    store_id: input.storeId,
    operational_preparation_slot_id: input.slotId,
    product_id: input.productId,
    batch_size: input.batchSize,
    preparation_minutes: input.preparationMinutes,
  });
}

export async function deletePreparationTime(input: DeletePreparationTimeInput) {
  await apiClient.delete(`/admin/settings/operational/preparation-capacity/times/${input.settingId}`, {
    data: { store_id: input.storeId },
  });
}
