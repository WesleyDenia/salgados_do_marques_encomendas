export interface OperationalSettings {
  ORDER_START_TIME: string;
  ORDER_END_TIME: string;
  ORDER_MINIMUM_MINUTES: number;
  ORDER_CANCEL_MINUTES: number;
  ORDER_SCHEDULING_WINDOW_DAYS: number;
  ORDER_SLOT_MODE: "periodo" | "horario";
  WHATSAPP_ORDER_TO: string;
  SETTINGS_VERSION: number;
}

export interface OperationalSettingsUpdatePayload extends Partial<Omit<OperationalSettings, 'SETTINGS_VERSION'>> {
  version: number;
}

export interface OperationalOrderTag {
  id: number;
  name: string;
  color: string;
  active: boolean;
  orders_count?: number;
}

export interface OperationalOrderTagPayload {
  name: string;
  color: string;
  active: boolean;
}

export interface OperationalPreparationSlot {
  id?: number;
  localId: string;
  name: string;
  active: boolean;
  displayOrder: number;
}

export interface OperationalPreparationProduct {
  id: number;
  name: string;
}

export interface OperationalPreparationSetting {
  id?: number;
  operationalPreparationSlotId?: number;
  slotLocalId: string;
  productId: number;
  batchSize: number;
  preparationTimeSeconds: number;
}

export interface OperationalPreparationCapacityConfig {
  slots: OperationalPreparationSlot[];
  settings: OperationalPreparationSetting[];
  products: OperationalPreparationProduct[];
}

export interface OperationalPreparationCapacityUpdatePayload {
  slots: Array<{
    id?: number;
    name: string;
    active: boolean;
    display_order: number;
  }>;
  settings: Array<{
    operational_preparation_slot_id?: number;
    slot_index?: number;
    product_id: number;
    batch_size: number;
    preparation_time_seconds: number;
  }>;
}
