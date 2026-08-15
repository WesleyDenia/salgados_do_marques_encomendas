import { apiClient } from "@/lib/api/http";
import { PanelSessionUser } from "@/lib/auth/session";
import { ApiMeta, ApiResponse } from "@/types/api";
import {
  OperationalOrderTag,
  OperationalOrderTagPayload,
  OperationalPreparationCapacityConfig,
  OperationalPreparationCapacityUpdatePayload,
  OperationalSettings,
  OperationalSettingsUpdatePayload,
} from "./types";

type ResourceResponse<T> = {
  data: T;
};

type ResourceCollectionResponse<T> = {
  data: T[];
  meta?: ApiMeta;
};

function readCollectionPayload<T>(payload: unknown): { data: T[]; meta?: ApiMeta } {
  if (Array.isArray(payload)) {
    return { data: payload };
  }

  if (payload && typeof payload === "object") {
    const collection = Reflect.get(payload, "data");
    const meta = Reflect.get(payload, "meta");

    if (Array.isArray(collection)) {
      return {
        data: collection as T[],
        meta: (meta as ApiMeta | undefined) ?? undefined,
      };
    }
  }

  return { data: [] };
}

function readResourcePayload<T>(payload: unknown): T | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const resource = Reflect.get(payload, "data");

    if (resource && typeof resource === "object" && !Array.isArray(resource)) {
      return resource as T;
    }

    return payload as T;
  }

  return null;
}

function normalizeOperationalOrderTag(resource: Partial<OperationalOrderTag>): OperationalOrderTag {
  return {
    id: typeof resource.id === "number" ? resource.id : 0,
    name: typeof resource.name === "string" ? resource.name : "",
    color:
      typeof resource.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(resource.color)
        ? resource.color.toUpperCase()
        : "#92400E",
    active: typeof resource.active === "boolean" ? resource.active : Boolean(resource.active),
    orders_count:
      typeof resource.orders_count === "number" ? resource.orders_count : undefined,
  };
}

type BackendPreparationCapacity = {
  slots?: Array<{
    id?: number;
    name?: string;
    active?: boolean;
    display_order?: number;
  }>;
  settings?: Array<{
    id?: number;
    operational_preparation_slot_id?: number;
    product_id?: number;
    batch_size?: number;
    preparation_time_seconds?: number;
  }>;
  products?: Array<{
    id?: number;
    name?: string;
  }>;
};

function normalizePreparationCapacityConfig(
  resource: BackendPreparationCapacity | null,
): OperationalPreparationCapacityConfig {
  const slots = (resource?.slots ?? []).map((slot, index) => ({
    id: typeof slot.id === "number" ? slot.id : undefined,
    localId: typeof slot.id === "number" ? `slot-${slot.id}` : `slot-new-${index}`,
    name: typeof slot.name === "string" ? slot.name : `Cuba ${index + 1}`,
    active: typeof slot.active === "boolean" ? slot.active : Boolean(slot.active ?? true),
    displayOrder: typeof slot.display_order === "number" ? slot.display_order : index,
  }));
  const localIdById = new Map(
    slots
      .filter((slot) => typeof slot.id === "number")
      .map((slot) => [slot.id as number, slot.localId]),
  );

  return {
    slots,
    settings: (resource?.settings ?? [])
      .filter(
        (setting) =>
          typeof setting.product_id === "number" &&
          typeof setting.operational_preparation_slot_id === "number",
      )
      .map((setting) => ({
        id: typeof setting.id === "number" ? setting.id : undefined,
        operationalPreparationSlotId: setting.operational_preparation_slot_id,
        slotLocalId:
          localIdById.get(setting.operational_preparation_slot_id as number) ??
          `slot-${setting.operational_preparation_slot_id}`,
        productId: setting.product_id as number,
        batchSize:
          typeof setting.batch_size === "number" && setting.batch_size > 0
            ? setting.batch_size
            : 25,
        preparationTimeSeconds:
          typeof setting.preparation_time_seconds === "number"
            ? setting.preparation_time_seconds
            : 0,
      })),
    products: (resource?.products ?? [])
      .filter((product) => typeof product.id === "number")
      .map((product) => ({
        id: product.id as number,
        name: typeof product.name === "string" ? product.name : `Artigo ${product.id}`,
      })),
  };
}

export async function getUsers() {
  const response = await apiClient.get<ApiResponse<PanelSessionUser[]>>("/admin/users");
  return response.data;
}

export async function updateUserRole(userId: number, role: string) {
  const response = await apiClient.put<ApiResponse<PanelSessionUser>>(`/admin/users/${userId}`, { role });
  return response.data;
}

export async function getOperationalSettings() {
  const response = await apiClient.get<OperationalSettings>("/admin/settings/operational");
  return response.data;
}

export async function updateOperationalSettings(payload: OperationalSettingsUpdatePayload) {
  const response = await apiClient.put<{ message: string; changes_count: number }>("/admin/settings/operational", payload);
  return response.data;
}

export async function resetOperationalSettings(version: number) {
  const response = await apiClient.post<{ message: string; changes_count: number }>("/admin/settings/operational/reset", { version });
  return response.data;
}

export async function testWhatsAppConnection(number: string) {
  const response = await apiClient.post<{ success: boolean; message: string }>("/admin/settings/test-whatsapp", { number });
  return response.data;
}

export async function getPreparationCapacityConfig() {
  const response = await apiClient.get<ResourceResponse<BackendPreparationCapacity>>(
    "/admin/settings/operational/preparation-capacity",
  );

  return normalizePreparationCapacityConfig(readResourcePayload<BackendPreparationCapacity>(response.data));
}

export async function updatePreparationCapacityConfig(
  payload: OperationalPreparationCapacityUpdatePayload,
) {
  const response = await apiClient.put<ResourceResponse<BackendPreparationCapacity>>(
    "/admin/settings/operational/preparation-capacity",
    payload,
  );

  return normalizePreparationCapacityConfig(readResourcePayload<BackendPreparationCapacity>(response.data));
}

export async function getOperationalOrderTags() {
  const response = await apiClient.get<ResourceCollectionResponse<OperationalOrderTag>>(
    "/admin/order-tags",
  );
  const payload = readCollectionPayload<OperationalOrderTag>(response.data);

  return payload.data.map(normalizeOperationalOrderTag);
}

export async function createOperationalOrderTag(payload: OperationalOrderTagPayload) {
  const response = await apiClient.post<ResourceResponse<OperationalOrderTag>>(
    "/admin/order-tags",
    payload,
  );
  const resource = readResourcePayload<OperationalOrderTag>(response.data);

  if (!resource) {
    throw new Error("Resposta inválida ao criar a tag.");
  }

  return normalizeOperationalOrderTag(resource);
}

export async function updateOperationalOrderTag(tagId: number, payload: OperationalOrderTagPayload) {
  const response = await apiClient.put<ResourceResponse<OperationalOrderTag>>(
    `/admin/order-tags/${tagId}`,
    payload,
  );
  const resource = readResourcePayload<OperationalOrderTag>(response.data);

  if (!resource) {
    throw new Error("Resposta inválida ao atualizar a tag.");
  }

  return normalizeOperationalOrderTag(resource);
}
