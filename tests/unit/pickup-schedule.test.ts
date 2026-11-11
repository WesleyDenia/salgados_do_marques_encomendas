import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOrderCreateInput } from "@/features/orders/schemas/order-schemas";
import { formatOrderPickupSchedule } from "@/features/orders/utils/pickup-schedule";
import type { Order } from "@/features/orders/types";

const order = (schedule: Pick<Order, "pickupDate" | "pickupTime" | "scheduledAt">): Order => ({
  id: 1,
  status: "placed",
  items: [],
  tags: [],
  ...schedule,
});

test("order create schema accepts independently undefined pickup parts", () => {
  const base = {
    storeId: 1,
    customerName: "Ana",
    customerContact: "912345678",
    items: [{ productId: 1, quantity: 1 }],
    paymentStatus: "pending" as const,
  };

  assert.equal(normalizeOrderCreateInput({ ...base, date: "", time: "" }).date, "");
  assert.equal(normalizeOrderCreateInput({ ...base, date: "2026-11-12", time: "" }).time, "");
  assert.equal(normalizeOrderCreateInput({ ...base, date: "", time: "10:30" }).time, "10:30");
});

test("pickup schedule formatting never invents a missing part", () => {
  assert.equal(formatOrderPickupSchedule(order({ pickupDate: "2026-11-12", pickupTime: null })), "12/11/2026 · Indefinido");
  assert.equal(formatOrderPickupSchedule(order({ pickupDate: null, pickupTime: "10:30:00" })), "Indefinido · 10:30");
  assert.equal(formatOrderPickupSchedule(order({ pickupDate: null, pickupTime: null })), "Indefinido");
  assert.equal(
    formatOrderPickupSchedule(order({ scheduledAt: "2026-11-12T10:30:00.000Z" }), "Europe/Lisbon"),
    "12/11/2026, 10:30",
  );
});
