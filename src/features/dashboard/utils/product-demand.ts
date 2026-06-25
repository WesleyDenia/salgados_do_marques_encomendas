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

function inferPackFlavorSlots(item: OrderItem) {
  const variantName = item.variantName?.trim();

  if (!variantName) {
    return null;
  }

  const unitMatch = variantName.match(/(\d+)/);

  if (!unitMatch) {
    return null;
  }

  const units = Number(unitMatch[1]);

  if (!Number.isFinite(units) || units < 25 || units % 25 !== 0) {
    return null;
  }

  return units / 25;
}

function buildFlavorDemandLabels(item: OrderItem) {
  if (item.flavorNames && item.flavorNames.length > 0) {
    const labels = item.flavorNames.map((name) => name.trim()).filter(Boolean);

    if (labels.length === 0) {
      return [];
    }

    const inferredSlots = inferPackFlavorSlots(item);

    if (labels.length === 1 && inferredSlots && inferredSlots > 1) {
      return Array.from({ length: inferredSlots }, () => labels[0]);
    }

    return labels;
  }

  if (item.flavorIds && item.flavorIds.length > 0) {
    const labels = item.flavorIds.map((id) => `#${id}`);
    const inferredSlots = inferPackFlavorSlots(item);

    if (labels.length === 1 && inferredSlots && inferredSlots > 1) {
      return Array.from({ length: inferredSlots }, () => labels[0]);
    }

    return labels;
  }

  return [];
}

function buildDemandRowsForItem(item: OrderItem): ProductDemandRow[] {
  const flavorLabels = buildFlavorDemandLabels(item);

  if (flavorLabels.length > 0) {
    return flavorLabels.map((label) => ({
      key: `flavor:${label}`,
      label,
      quantity: item.quantity,
    }));
  }

  return [
    {
      key: buildDemandItemKey(item),
      label: buildDemandItemLabel(item),
      quantity: item.quantity,
    },
  ];
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

      for (const row of buildDemandRowsForItem(item)) {
        const existing = aggregates.get(row.key);
        const nextQuantity = (existing?.quantity ?? 0) + row.quantity;

        totalQuantity += row.quantity;
        aggregates.set(row.key, {
          key: row.key,
          label: row.label,
          quantity: nextQuantity,
        });
      }
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
