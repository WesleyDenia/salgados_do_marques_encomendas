import assert from "node:assert/strict";
import test from "node:test";

import { buildProductDemandSummary } from "@/features/dashboard/utils/product-demand";
import type { Order } from "@/features/orders/types";

test("buildProductDemandSummary expands pack demand into flavors while ignoring finished orders", () => {
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
          variantName: "Pack 100 Unidades",
          flavorNames: ["Pack Mix", "Pack Mix", "Coxinha de Frango", "Coxinha de Frango"],
        },
        {
          productId: 11,
          productName: "Coxinha de Bacalhau",
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
          quantity: 2,
          variantId: 100,
          variantName: "Pack 100 Unidades",
          flavorNames: ["Pack Mix", "Pack Mix", "Coxinha de Frango", "Coxinha de Frango"],
        },
        {
          productId: 12,
          productName: "Pack 50 Unidades",
          quantity: 3,
          variantId: 101,
          variantName: "Pack 50 Unidades",
          flavorNames: ["Leitão"],
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
  assert.equal(summary.totalQuantity, 70);
  assert.deepEqual(summary.rows, [
    {
      key: "flavor:Coxinha de Frango",
      label: "Coxinha de Frango",
      quantity: 28,
    },
    {
      key: "flavor:Pack Mix",
      label: "Pack Mix",
      quantity: 28,
    },
    {
      key: "11:no-variant",
      label: "Coxinha de Bacalhau",
      quantity: 8,
    },
    {
      key: "flavor:Leitão",
      label: "Leitão",
      quantity: 6,
    },
  ]);
});
