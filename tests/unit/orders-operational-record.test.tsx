import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OrdersOperationalRecordContent } from "@/features/orders/components/orders-operational-record";

test("OrdersOperationalRecordContent renders the persisted operational record", () => {
  const markup = renderToStaticMarkup(
    <OrdersOperationalRecordContent
      orders={[
        {
          id: 42,
          status: "placed",
          paymentStatus: "pending",
          slot: "manha",
          customerName: "Maria Silva",
          customerContact: "912345678",
          scheduledAt: "2026-05-20T09:30:00+00:00",
          total: 24,
          notes: "Sem picante",
          store: {
            id: 3,
            name: "Loja Centro",
          },
          user: null,
          items: [
            {
              id: 1,
              productId: 12,
              productName: "Coxinha",
              quantity: 12,
              total: 24,
            },
          ],
          createdAt: "2026-05-12T09:30:00+00:00",
        },
      ]}
    />,
  );

  assert.match(markup, /Registo operacional/);
  assert.match(markup, /Maria Silva/);
  assert.match(markup, /Loja Centro/);
  assert.match(markup, /12x Coxinha/);
  assert.match(markup, /Pendente/);
  assert.match(markup, /Manhã/);
  assert.match(markup, /Sem picante/);
});
