import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createOrder } from "@/features/orders/api";
import type { OrderCreateInput } from "@/features/orders/schemas/order-schemas";

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OrderCreateInput) => createOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
