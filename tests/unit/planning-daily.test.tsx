import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getDailyPlanning } from "@/features/planning/api";
import { PlanningDailyBoard } from "@/features/planning/components/planning-daily-view";
import {
  buildPlanningDayDateRange,
  normalizePlanningDay,
  resolvePlanningSlotContext,
} from "@/features/planning/utils";
import { apiClient } from "@/lib/api/http";

test("normalizePlanningDay defaults to the current operational day in Lisbon", () => {
  assert.equal(
    normalizePlanningDay(undefined, "Europe/Lisbon", new Date("2026-05-20T00:30:00.000Z")),
    "2026-05-20",
  );
  assert.equal(
    normalizePlanningDay("2026-05-18", "Europe/Lisbon", new Date("2026-05-20T00:30:00.000Z")),
    "2026-05-18",
  );
  assert.equal(
    normalizePlanningDay("2026-02-31", "Europe/Lisbon", new Date("2026-05-20T00:30:00.000Z")),
    "2026-05-20",
  );
});

test("buildPlanningDayDateRange converts the selected day to UTC boundaries", () => {
  assert.deepEqual(buildPlanningDayDateRange("2026-05-20", "Europe/Lisbon"), {
    scheduledFrom: "2026-05-19T23:00:00.000Z",
    scheduledTo: "2026-05-20T22:59:59.000Z",
  });
});

test("PlanningDailyBoard renders the official slot states and the full day order list", () => {
  const markup = renderToStaticMarkup(
    <PlanningDailyBoard
      day="2026-05-20"
      timeZone="Europe/Lisbon"
      statusLabels={{
        accepted: "Aceite",
        placed: "Realizado",
      }}
      slotContextStoreName="Loja Centro"
      slotCapacities={[
        { slot: "manha", state: "disponível" },
        { slot: "tarde", state: "limitado" },
        { slot: "noite", state: "bloqueado" },
      ]}
      data={{
        filters: { day: "2026-05-20" },
        selectedDayLabel: "20/05/2026",
        slotLabels: {
          manha: "Manhã",
          tarde: "Tarde",
          noite: "Noite",
        },
        summary: {
          orderCount: 2,
          itemQuantity: 18,
          paidCount: 1,
          attentionCount: 2,
          slotCounts: {
            manha: 1,
            tarde: 1,
            noite: 0,
          },
        },
        orders: [
          {
            id: 42,
            status: "placed",
            paymentStatus: "pending",
            slot: "manha",
            customerName: "Maria Silva",
            scheduledAt: "2026-05-20T08:30:00.000Z",
            total: 24,
            notes: null,
            items: [
              {
                id: 1,
                productId: 12,
                productName: "Coxinha",
                quantity: 12,
                total: 24,
              },
            ],
            store: {
              id: 3,
              name: "Loja Centro",
            },
          },
          {
            id: 43,
            status: "accepted",
            paymentStatus: "paid",
            slot: "tarde",
            customerName: "João Costa",
            scheduledAt: "2026-05-20T14:00:00.000Z",
            total: 18,
            notes: null,
            items: [
              {
                id: 2,
                productId: 14,
                productName: "Rissole",
                quantity: 6,
                total: 18,
              },
            ],
            store: {
              id: 3,
              name: "Loja Centro",
            },
          },
        ],
      }}
    />,
  );

  assert.match(markup, /Primeira entrega funcional do planeamento diário/);
  assert.match(markup, /Contexto de capacidade fornecido pelos contratos do backend para Loja Centro/);
  assert.match(markup, /disponível/);
  assert.match(markup, /limitado/);
  assert.match(markup, /bloqueado/);
  assert.match(markup, /Maria Silva/);
  assert.match(markup, /João Costa/);
  assert.match(markup, /Realizado/);
  assert.match(markup, /Aceite/);
  assert.match(markup, /12 itens/);
});

test("PlanningDailyBoard avoids fabricating summary cards when the backend omits the official aggregate", () => {
  const markup = renderToStaticMarkup(
    <PlanningDailyBoard
      day="2026-05-20"
      timeZone="Europe/Lisbon"
      slotCapacities={[]}
      slotContextError="O dia inclui encomendas de várias lojas; o estado oficial de slots só é mostrado quando o conjunto pertence a uma única loja."
      data={{
        filters: { day: "2026-05-20" },
        selectedDayLabel: "20/05/2026",
        slotLabels: {},
        summary: null,
        orders: [
          {
            id: 42,
            status: "placed",
            paymentStatus: "pending",
            slot: "manha",
            customerName: "Maria Silva",
            scheduledAt: "2026-05-20T08:30:00.000Z",
            total: 24,
            notes: null,
            items: [
              {
                id: 1,
                productId: 12,
                productName: "Coxinha",
                quantity: 12,
                total: 24,
              },
            ],
            store: {
              id: 3,
              name: "Loja Centro",
            },
          },
        ],
      }}
    />,
  );

  assert.match(markup, /O backend não devolveu um resumo oficial do dia/);
  assert.match(markup, /várias lojas/);
  assert.doesNotMatch(markup, /A pedir atenção/);
});

test("PlanningDailyBoard exposes the empty day state explicitly", () => {
  const markup = renderToStaticMarkup(
    <PlanningDailyBoard
      day="2026-05-21"
      timeZone="Europe/Lisbon"
      slotCapacities={[]}
      data={{
        filters: { day: "2026-05-21" },
        selectedDayLabel: "21/05/2026",
        slotLabels: {},
        summary: {
          orderCount: 0,
          itemQuantity: 0,
          paidCount: 0,
          attentionCount: 0,
          slotCounts: {},
        },
        orders: [],
      }}
    />,
  );

  assert.match(markup, /Sem encomendas para este dia operacional/);
  assert.match(markup, /21\/05\/2026/);
});

test("resolvePlanningSlotContext only enables slot context for a single-store dataset", () => {
  assert.deepEqual(
    resolvePlanningSlotContext({
      filters: { day: "2026-05-20" },
      selectedDayLabel: "20/05/2026",
      slotLabels: {},
      summary: null,
      orders: [],
    }),
    {
      status: "empty",
      reason: "Sem encomendas no dia selecionado para pedir contexto oficial de slots.",
    },
  );

  assert.deepEqual(
    resolvePlanningSlotContext({
      filters: { day: "2026-05-20" },
      selectedDayLabel: "20/05/2026",
      slotLabels: {},
      summary: null,
      orders: [
        {
          id: 42,
          status: "placed",
          items: [],
          store: { id: 1, name: "Loja Centro" },
        },
        {
          id: 43,
          status: "accepted",
          items: [],
          store: { id: 2, name: "Loja Norte" },
        },
      ],
    }),
    {
      status: "mixed",
      reason: "O dia inclui encomendas de várias lojas; o estado oficial de slots só é mostrado quando o conjunto pertence a uma única loja.",
    },
  );
});

test("getDailyPlanning preserves only the official summary and normalizes partial payloads safely", async () => {
  const originalGet = apiClient.get;

  apiClient.get = (async () => ({
    data: {
      data: [
        {
          id: 11,
          status: "placed",
          payment_status: "pending",
          slot: "manha",
          customer_name: "Ana",
          scheduled_at: "2026-05-20T09:30:00.000Z",
          total: 18,
          items: [
            {
              id: 1,
              product_id: 7,
              name: "Rissol",
              quantity: 6,
              total: 18,
            },
          ],
          store: { id: 1, name: "Loja A" },
        },
      ],
      filters: { day: "2026-05-20" },
      selected_day_label: "20/05/2026",
      summary: {
        orderCount: 1,
      },
    },
  })) as typeof apiClient.get;

  try {
    const planning = await getDailyPlanning("2026-05-20");

    assert.deepEqual(planning.summary, {
      orderCount: 1,
      itemQuantity: 0,
      paidCount: 0,
      attentionCount: 0,
      slotCounts: {},
    });
  } finally {
    apiClient.get = originalGet;
  }
});
