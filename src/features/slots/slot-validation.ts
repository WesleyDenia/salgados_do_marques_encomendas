import { type SlotCapacity } from "./types";

export function validateSlotSelection(
  selectedSlot: string,
  capacities: SlotCapacity[]
): string | null {
  const capacity = capacities.find((c) => c.slot === selectedSlot);
  if (capacity?.state === "bloqueado") {
    return "O slot selecionado não tem capacidade disponível. Por favor, escolha outro slot.";
  }
  return null;
}
