import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPartialWithdrawalGroups,
  hasPartialWithdrawalGroupBalance,
} from "@/features/orders/partial-withdrawal-groups";
import type { OrderItem } from "@/features/orders/types";

function makePack(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 1,
    productId: 10,
    productName: "Pack 100",
    quantity: 1,
    variantId: 100,
    variantName: "Pack 100",
    originalUnits: 100,
    remainingUnits: 100,
    canWithdrawPartially: true,
    ...overrides,
  };
}

test("groups ten compatible packs into an aggregate balance of 1000 units", () => {
  const groups = buildPartialWithdrawalGroups(
    Array.from({ length: 10 }, (_, index) => makePack({ id: index + 1 })),
  );

  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 10);
  assert.equal(groups[0].remainingUnits, 1000);
  assert.equal(groups[0].referenceItem.id, 1);
});

test("keeps the compatible group available with 900 units after a withdrawal", () => {
  const groups = buildPartialWithdrawalGroups(
    Array.from({ length: 10 }, (_, index) =>
      makePack({
        id: index + 1,
        remainingUnits: index === 0 ? 0 : 100,
      }),
    ),
  );

  assert.equal(groups.length, 1);
  assert.equal(groups[0].remainingUnits, 900);
  assert.equal(groups[0].referenceItem.id, 2);
});

test("does not expose a group when all compatible items are exhausted", () => {
  const groups = buildPartialWithdrawalGroups([
    makePack({ id: 1, remainingUnits: 0 }),
    makePack({ id: 2, remainingUnits: 0 }),
  ]);

  assert.deepEqual(groups, []);
});

test("does not infer an available balance when the backend omits remaining units", () => {
  const groups = buildPartialWithdrawalGroups([
    makePack({ remainingUnits: null, originalUnits: 100 }),
  ]);

  assert.deepEqual(groups, []);
});

test("keeps different products, variants and name snapshots in separate groups", () => {
  const groups = buildPartialWithdrawalGroups([
    makePack({ id: 1 }),
    makePack({ id: 2, productId: 11 }),
    makePack({ id: 3, variantId: 101 }),
    makePack({ id: 4, productName: "Pack 100 Promocional" }),
  ]);

  assert.equal(groups.length, 4);
});

test("rejects a requested quantity above the aggregate group balance", () => {
  const [group] = buildPartialWithdrawalGroups([
    makePack({ id: 1, remainingUnits: 100 }),
    makePack({ id: 2, remainingUnits: 75 }),
  ]);

  assert.equal(hasPartialWithdrawalGroupBalance(group, 175), true);
  assert.equal(hasPartialWithdrawalGroupBalance(group, 200), false);
});
