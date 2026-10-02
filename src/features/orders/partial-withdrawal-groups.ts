import type { OrderItem } from "@/features/orders/types";

export type PartialWithdrawalGroup = {
  key: string;
  items: OrderItem[];
  referenceItem: OrderItem;
  remainingUnits: number;
};

function buildGroupKey(item: OrderItem) {
  return JSON.stringify([
    item.productId,
    item.variantId ?? null,
    item.productName,
  ]);
}

function resolveRemainingUnits(item: OrderItem) {
  return typeof item.remainingUnits === "number" && Number.isFinite(item.remainingUnits)
    ? Math.max(0, item.remainingUnits)
    : 0;
}

export function buildPartialWithdrawalGroups(
  items: OrderItem[],
): PartialWithdrawalGroup[] {
  const groups = new Map<string, OrderItem[]>();

  for (const item of items) {
    if (!item.canWithdrawPartially) {
      continue;
    }

    const key = buildGroupKey(item);
    const currentItems = groups.get(key) ?? [];
    currentItems.push(item);
    groups.set(key, currentItems);
  }

  return Array.from(groups, ([key, groupedItems]) => {
    const remainingUnits = groupedItems.reduce(
      (total, item) => total + resolveRemainingUnits(item),
      0,
    );
    const referenceItem =
      groupedItems.find((item) => resolveRemainingUnits(item) >= 25) ??
      groupedItems[0];

    return {
      key,
      items: groupedItems,
      referenceItem,
      remainingUnits,
    };
  }).filter((group) => group.remainingUnits >= 25);
}

export function hasPartialWithdrawalGroupBalance(
  group: PartialWithdrawalGroup,
  requestedUnits: number,
) {
  return Number.isFinite(requestedUnits) && requestedUnits <= group.remainingUnits;
}
