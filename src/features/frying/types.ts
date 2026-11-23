export type FryingStore = { id: number; name: string };

export type FryingTask = {
  allocationId: number;
  orderId: number;
  customerName: string | null;
  productName: string;
  batchUnits: number;
  preparationTimeSeconds: number;
  pickupAt: string | null;
  readyBy: string | null;
  startAt: string | null;
  finishAt: string | null;
};

export type FryingSlot = { id: number; name: string; displayOrder: number; tasks: FryingTask[] };

export type FryingPlan = {
  date: string;
  timeZone: string;
  store: FryingStore;
  ordersCount: number;
  tasksCount: number;
  earliestStartAt: string | null;
  warnings: string[];
  slots: FryingSlot[];
};

export type PreparationSlot = {
  id: number;
  storeId: number | null;
  name: string;
  active: boolean;
  displayOrder: number;
};

export type PreparationSetting = {
  id: number;
  slotId: number;
  productId: number;
  batchSize: number;
  preparationTimeSeconds: number;
};

export type PreparationProduct = { id: number; name: string };

export type PreparationCapacity = {
  slots: PreparationSlot[];
  settings: PreparationSetting[];
  products: PreparationProduct[];
};

export type CreatePreparationSlotInput = {
  storeId: number;
  name: string;
  cloneFromSlotId?: number;
};

export type SavePreparationTimeInput = {
  storeId: number;
  slotId: number;
  productId: number;
  batchSize: number;
  preparationMinutes: number;
};
