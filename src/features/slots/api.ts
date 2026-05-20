import { apiClient } from "@/lib/api/http";
import { type SlotCapacityResponse } from "./types";

export type GetSlotCapacitiesParams = {
  storeId: number;
  date: string; // YYYY-MM-DD
};

export async function getSlotCapacities(
  params: GetSlotCapacitiesParams
): Promise<SlotCapacityResponse> {
  const response = await apiClient.get<SlotCapacityResponse>(
    "/orders/availability/slots",
    { params },
  );

  return response.data;
}
