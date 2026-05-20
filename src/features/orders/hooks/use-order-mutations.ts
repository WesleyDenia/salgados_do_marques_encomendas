import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createOrder,
  type OrdersResponse,
  updateOrder,
  updateOrderStatus,
} from "@/features/orders/api";
import { orderKeys } from "@/features/orders/hooks/use-order-queries";
import type { OrderCreateInput } from "@/features/orders/schemas/order-schemas";
import type { Order } from "@/features/orders/types";
import { slotKeys } from "@/features/slots/queries";

const orderSearchKeys = [...orderKeys.all, "search"] as const;

function mergeConfirmedOrder(existingOrder: Order | undefined, updatedOrder: Order) {
  if (!existingOrder) {
    return updatedOrder;
  }

  return {
    ...existingOrder,
    ...updatedOrder,
    canEdit: updatedOrder.canEdit ?? existingOrder.canEdit,
    paymentStatus: updatedOrder.paymentStatus ?? existingOrder.paymentStatus,
    slot: updatedOrder.slot ?? existingOrder.slot,
    customerName: updatedOrder.customerName ?? existingOrder.customerName,
    customerContact: updatedOrder.customerContact ?? existingOrder.customerContact,
    items: updatedOrder.items.length > 0 ? updatedOrder.items : existingOrder.items,
    notes: updatedOrder.notes ?? existingOrder.notes,
    scheduledAt: updatedOrder.scheduledAt ?? existingOrder.scheduledAt,
    total: updatedOrder.total ?? existingOrder.total,
    store: updatedOrder.store ?? existingOrder.store,
    user: updatedOrder.user ?? existingOrder.user,
    createdAt: updatedOrder.createdAt ?? existingOrder.createdAt,
  };
}

function updateOrderInCollection(
  collection: OrdersResponse | undefined,
  updatedOrder: Order,
) {
  if (!collection) {
    return collection;
  }

  let hasChanges = false;
  const data = collection.data.map((order) => {
    if (String(order.id) !== String(updatedOrder.id)) {
      return order;
    }

    hasChanges = true;
    return mergeConfirmedOrder(order, updatedOrder);
  });

  if (!hasChanges) {
    return collection;
  }

  return {
    ...collection,
    data,
  };
}

export function synchronizeConfirmedOrderCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updatedOrder: Order,
) {
  queryClient.setQueryData<Order | undefined>(
    orderKeys.detail(updatedOrder.id),
    (current) => mergeConfirmedOrder(current, updatedOrder),
  );

  queryClient.setQueriesData<OrdersResponse>(
    {
      predicate: (query) => {
        if (!Array.isArray(query.queryKey)) {
          return false;
        }

        if (query.queryKey[0] !== orderKeys.all[0]) {
          return false;
        }

        return query.queryKey[1] === "list" || query.queryKey[1] === "search";
      },
    },
    (current) => updateOrderInCollection(current, updatedOrder),
  );
}

export function handleConfirmedOrderStatusUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  updatedOrder: Order,
  orderId: number | string,
) {
  synchronizeConfirmedOrderCaches(queryClient, updatedOrder);
  void invalidateOrderQueries(queryClient, orderId);
}

export async function invalidateOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: number | string,
) {
  await queryClient.invalidateQueries({ queryKey: orderKeys.list() });
  await queryClient.invalidateQueries({ queryKey: orderSearchKeys });
  await queryClient.invalidateQueries({
    queryKey: orderKeys.detail(orderId),
  });
}

export async function invalidateOrderWriteQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId?: number | string,
) {
  await queryClient.invalidateQueries({ queryKey: orderKeys.list() });
  await queryClient.invalidateQueries({ queryKey: orderSearchKeys });

  if (orderId != null) {
    await queryClient.invalidateQueries({
      queryKey: orderKeys.detail(orderId),
    });
  }

  await queryClient.invalidateQueries({ queryKey: slotKeys.all });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      timeZone,
    }: {
      input: OrderCreateInput;
      timeZone?: string;
    }) => createOrder(input, timeZone),
    onSuccess: async () => {
      await invalidateOrderWriteQueries(queryClient);
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      input,
      timeZone,
    }: {
      orderId: number | string;
      input: OrderCreateInput;
      timeZone?: string;
    }) => updateOrder(orderId, input, timeZone),
    onSuccess: async (_, { orderId }) => {
      await invalidateOrderWriteQueries(queryClient, orderId);
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: number | string;
      status: string;
    }) => updateOrderStatus(orderId, status),
    onSuccess: (updatedOrder, { orderId }) => {
      handleConfirmedOrderStatusUpdate(queryClient, updatedOrder, orderId);
    },
  });
}
