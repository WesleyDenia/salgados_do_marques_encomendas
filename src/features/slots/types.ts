export type SlotCapacityState = "disponível" | "limitado" | "bloqueado";

export type SlotCapacity = {
  slot: "manha" | "tarde" | "noite";
  state: SlotCapacityState;
};

export type SlotCapacityResponse = {
  data: {
    store_id: number;
    date: string;
    timezone: string;
    slots: SlotCapacity[];
  };
};
