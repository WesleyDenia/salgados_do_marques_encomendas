import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeOrderCreateInput,
  OrderCreateSchema,
} from "@/features/orders/schemas/order-schemas";

test("OrderCreateSchema accepts the essential order creation fields", () => {
  const parsed = OrderCreateSchema.parse({
    storeId: 3,
    customerName: "Maria Silva",
    customerContact: "912345678",
    items: [
      {
        productId: 12,
        quantity: 12,
      },
    ],
    observations: "Sem picante",
    date: "2026-05-20",
    time: "10:30",
    slot: "manha",
    paymentStatus: "pending",
  });

  assert.equal(parsed.customerName, "Maria Silva");
  assert.equal(parsed.items[0]?.quantity, 12);
  assert.equal(parsed.paymentStatus, "pending");
});

test("OrderCreateSchema rejects incomplete or invalid order data", () => {
  const result = OrderCreateSchema.safeParse({
    storeId: 0,
    customerName: "",
    customerContact: "",
    items: [{ productId: 0, quantity: 0 }],
    date: "",
    time: "",
    slot: "",
    paymentStatus: "unknown",
  });

  assert.equal(result.success, false);
});

test("normalizeOrderCreateInput trims text fields before persistence", () => {
  const normalized = normalizeOrderCreateInput({
    storeId: 8,
    customerName: "  Joao Santos  ",
    customerContact: "  919999999  ",
    items: [
      {
        productId: "14",
        quantity: 24,
      },
    ],
    observations: "  Entregar na loja  ",
    date: "2026-05-21",
    time: "15:45",
    slot: "tarde",
    paymentStatus: "paid",
  });

  assert.equal(normalized.customerName, "Joao Santos");
  assert.equal(normalized.customerContact, "919999999");
  assert.equal(normalized.items[0]?.productId, 14);
  assert.equal(normalized.observations, "Entregar na loja");
});

test("OrderCreateSchema rejects invalid phone format", () => {
  const result = OrderCreateSchema.safeParse({
    storeId: 3,
    customerName: "Maria Silva",
    customerContact: "123abc456", // invalid phone
    items: [{ productId: 12, quantity: 12 }],
    date: "2026-05-20",
    time: "10:30",
    slot: "manha",
    paymentStatus: "pending",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues.some(i => i.path.includes("customerContact")), true);
  }
});

test("OrderCreateSchema rejects phone with only spaces/hyphens", () => {
  const result = OrderCreateSchema.safeParse({
    storeId: 3,
    customerName: "Maria Silva",
    customerContact: "         ", // spaces only
    items: [{ productId: 12, quantity: 12 }],
    date: "2026-05-20",
    time: "10:30",
    slot: "manha",
    paymentStatus: "pending",
  });
  assert.equal(result.success, false);
});

test("OrderCreateSchema rejects invalid date/time format", () => {
  const resultDate1 = OrderCreateSchema.safeParse({
    storeId: 3,
    customerName: "Maria Silva",
    customerContact: "912345678",
    items: [{ productId: 12, quantity: 12 }],
    date: "20-05-2026", // invalid date format
    time: "10:30",
    slot: "manha",
    paymentStatus: "pending",
  });
  assert.equal(resultDate1.success, false);
  
  const resultDate2 = OrderCreateSchema.safeParse({
    storeId: 3,
    customerName: "Maria Silva",
    customerContact: "912345678",
    items: [{ productId: 12, quantity: 12 }],
    date: "9999-99-99", // invalid date conceptually
    time: "10:30",
    slot: "manha",
    paymentStatus: "pending",
  });
  assert.equal(resultDate2.success, false);
  
  const resultTime = OrderCreateSchema.safeParse({
    storeId: 3,
    customerName: "Maria Silva",
    customerContact: "912345678",
    items: [{ productId: 12, quantity: 12 }],
    date: "2026-05-20",
    time: "25:61", // invalid time format
    slot: "manha",
    paymentStatus: "pending",
  });
  assert.equal(resultTime.success, false);
});

test("OrderCreateSchema rejects empty items list", () => {
  const result = OrderCreateSchema.safeParse({
    storeId: 3,
    customerName: "Maria Silva",
    customerContact: "912345678",
    items: [], // empty items
    date: "2026-05-20",
    time: "10:30",
    slot: "manha",
    paymentStatus: "pending",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues.some(i => i.path.includes("items")), true);
  }
});
