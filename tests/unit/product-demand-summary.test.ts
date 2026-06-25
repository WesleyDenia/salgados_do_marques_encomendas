import assert from "node:assert/strict";
import test from "node:test";

import { buildProductDemandSummary } from "@/features/dashboard/utils/product-demand";
import type { Order } from "@/features/orders/types";

test("buildProductDemandSummary aggregates product demand by product and variant while ignoring finished orders", () => {
  const orders: Order[] = [
    {
      id: 1,
      status: "placed",
      items: [
        {
          productId: 10,
          productName: "Pack Mix",
          quantity: 12,
          variantId: 100,
          variantName: "30 unidades",
        },
        {
          productId: 11,
          productName: "Coxinha",
          quantity: 8,
        },
      ],
      tags: [],
    },
    {
      id: 2,
      status: "accepted",
      items: [
        {
          productId: 10,
          productName: "Pack Mix",
          quantity: 44,
          variantId: 100,
          variantName: "30 unidades",
        },
        {
          productId: 10,
          productName: "Pack Mix",
          quantity: 5,
          variantId: 101,
          variantName: "15 unidades",
        },
      ],
      tags: [],
    },
    {
      id: 3,
      status: "done",
      items: [
        {
          productId: 11,
          productName: "Coxinha",
          quantity: 99,
        },
      ],
      tags: [],
    },
  ];

  const summary = buildProductDemandSummary(orders);

  assert.equal(summary.orderCount, 2);
  assert.equal(summary.totalQuantity, 69);
  assert.deepEqual(summary.rows, [
    {
      key: "10:100",
      label: "Pack Mix · 30 unidades",
      quantity: 56,
    },
    {
      key: "11:no-variant",
      label: "Coxinha",
      quantity: 8,
    },
    {
      key: "10:101",
      label: "Pack Mix · 15 unidades",
      quantity: 5,
    },
  ]);
});
