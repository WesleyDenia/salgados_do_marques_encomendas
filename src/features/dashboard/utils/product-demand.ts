"use client";

import type { Order, OrderItem } from "@/features/orders/types";

export type ProductDemandRow = {
  key: string;
  label: string;
  quantity: number;
};

export type ProductDemandSummary = {
  rows: ProductDemandRow[];
  orderCount: number;
  totalQuantity: number;
};

const NON_DEMAND_ORDER_STATUSES = new Set(["done", "canceled", "rejected"]);

function isDemandRelevantOrder(order: Order) {
  return !NON_DEMAND_ORDER_STATUSES.has(order.status);
}

function buildDemandItemKey(item: OrderItem) {
  return `${item.productId}:${item.variantId ?? "no-variant"}`;
}

function buildDemandItemLabel(item: OrderItem) {
  const productName = item.productName.trim();
  const variantName = item.variantName?.trim();

  if (variantName) {
    return `${productName} · ${variantName}`;
  }

  return productName;
}

export function buildProductDemandSummary(orders: Order[]): ProductDemandSummary {
  const aggregates = new Map<string, ProductDemandRow>();
  let orderCount = 0;
  let totalQuantity = 0;

  for (const order of orders) {
    if (!isDemandRelevantOrder(order)) {
      continue;
    }

    orderCount += 1;

    for (const item of order.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        continue;
      }

      const key = buildDemandItemKey(item);
      const existing = aggregates.get(key);
      const nextQuantity = (existing?.quantity ?? 0) + item.quantity;

      totalQuantity += item.quantity;
      aggregates.set(key, {
        key,
        label: buildDemandItemLabel(item),
        quantity: nextQuantity,
      });
    }
  }

  return {
    rows: [...aggregates.values()].sort((left, right) => {
      if (right.quantity !== left.quantity) {
        return right.quantity - left.quantity;
      }

      return left.label.localeCompare(right.label, "pt-PT");
    }),
    orderCount,
    totalQuantity,
  };
}
