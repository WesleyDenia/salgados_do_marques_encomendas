export interface OperationalSettings {
  ORDER_START_TIME: string;
  ORDER_END_TIME: string;
  ORDER_MINIMUM_MINUTES: number;
  ORDER_CANCEL_MINUTES: number;
  ORDER_SCHEDULING_WINDOW_DAYS: number;
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
