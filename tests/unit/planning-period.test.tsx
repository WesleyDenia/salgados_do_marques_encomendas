import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getPeriodPlanning } from "@/features/planning/api";
import { PlanningCustomPeriodBoard } from "@/features/planning/components/planning-custom-period-view";
import { planningKeys } from "@/features/planning/hooks/use-daily-planning";
import {
  buildPlanningPeriodDateRange,
  resolvePlanningPeriodState,
} from "@/features/planning/utils";
import { apiClient } from "@/lib/api/http";

test("buildPlanningPeriodDateRange converts a DST-crossing period to UTC boundaries", () => {
  assert.deepEqual(
    buildPlanningPeriodDateRange("2026-10-24", "2026-10-26", "Europe/Lisbon"),
    {
      scheduledFrom: "2026-10-23T23:00:00.000Z",
      scheduledTo: "2026-10-26T23:59:59.000Z",
    },
  );
});

test("planningKeys isolates period cache entries from the other planning views", () => {
  assert.deepEqual(planningKeys.period("2026-05-20", "2026-05-22"), [
    "planning",
    "period",
    "2026-05-20",
    "2026-05-22",
  ]);
});

test("resolvePlanningPeriodState keeps explicit period filters and flags invalid or incomplete ranges", () => {
  assert.deepEqual(
    resolvePlanningPeriodState(
      "period",
      "2026-05-21",
      "2026-05-18",
      "2026-05-20",
      "2026-05-22",
      "Europe/Lisbon",
      new Date("2026-05-20T00:30:00.000Z"),
    ),
    {
      view: "period",
      day: "2026-05-21",
      weekStart: "2026-05-18",
      startDate: "2026-05-20",
      endDate: "2026-05-22",
      periodStatus: "ready",
    },
  );

  assert.deepEqual(
    resolvePlanningPeriodState(
      "period",
      "2026-05-21",
      "2026-05-18",
      "2026-05-20",
      undefined,
      "Europe/Lisbon",
      new Date("2026-05-20T00:30:00.000Z"),
    ),
    {
      view: "period",
      day: "2026-05-21",
      weekStart: "2026-05-18",
      startDate: "2026-05-20",
      endDate: "",
      periodStatus: "incomplete",
    },
  );

  assert.deepEqual(
    resolvePlanningPeriodState(
      "period",
      "2026-05-21",
      "2026-05-18",
      "2026-05-22",
      "2026-05-20",
      "Europe/Lisbon",
      new Date("2026-05-20T00:30:00.000Z"),
    ),
    {
      view: "period",
      day: "2026-05-21",
      weekStart: "2026-05-18",
      startDate: "2026-05-22",
      endDate: "2026-05-20",
      periodStatus: "invalid",
    },
  );
});

test("PlanningCustomPeriodBoard renders the official period summary and grouped daily detail", () => {
  const markup = renderToStaticMarkup(
    <PlanningCustomPeriodBoard
      startDate="2026-05-20"
      endDate="2026-05-22"
      timeZone="Europe/Lisbon"
      statusLabels={{
        accepted: "Aceite",
        placed: "Realizado",
      }}
      data={{
        filters: {
          startDate: "2026-05-20",
          endDate: "2026-05-22",
        },
        selectedPeriodLabel: "20/05/2026 - 22/05/2026",
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
            sem_slot: 0,
          },
        },
        slotOccupancy: {
          manha: {
            count: 1,
            label: "Manhã",
            state: null,
            contextStatus: "insufficient_context",
            contextReason:
              "O agregado do período combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
          },
          tarde: {
            count: 1,
            label: "Tarde",
            state: null,
            contextStatus: "insufficient_context",
            contextReason:
              "O agregado do período combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
          },
        },
        daySummaries: {
          "2026-05-20": {
            label: "Quarta-feira · 20/05",
            orderCount: 1,
            itemQuantity: 12,
            paidCount: 0,
            attentionCount: 1,
            slotCounts: {
              manha: 1,
              tarde: 0,
              noite: 0,
              sem_slot: 0,
            },
            slotOccupancy: {
              manha: {
                count: 1,
                label: "Manhã",
                state: "disponível",
                contextStatus: "official",
                contextReason: null,
              },
            },
          },
          "2026-05-21": {
            label: "Quinta-feira · 21/05",
            orderCount: 0,
            itemQuantity: 0,
            paidCount: 0,
            attentionCount: 0,
            slotCounts: {
              manha: 0,
              tarde: 0,
              noite: 0,
              sem_slot: 0,
            },
            slotOccupancy: {
              manha: {
                count: 0,
                label: "Manhã",
                state: null,
                contextStatus: "insufficient_context",
                contextReason:
                  "Sem encomendas suficientes neste conjunto para determinar um contexto oficial único de disponibilidade.",
              },
            },
          },
          "2026-05-22": {
            label: "Sexta-feira · 22/05",
            orderCount: 1,
            itemQuantity: 6,
            paidCount: 1,
            attentionCount: 1,
            slotCounts: {
              manha: 0,
              tarde: 1,
              noite: 0,
              sem_slot: 0,
            },
            slotOccupancy: {
              tarde: {
                count: 1,
                label: "Tarde",
                state: "limitado",
                contextStatus: "official",
                contextReason: null,
              },
            },
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
            scheduledAt: "2026-05-22T14:00:00.000Z",
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

  assert.match(markup, /Planeamento por período personalizado/);
  assert.match(markup, /Total do período/);
  assert.match(markup, /Carga agregada por slot/);
  assert.match(markup, /Ocupação oficial por slot/);
  assert.match(markup, /20\/05\/2026 - 22\/05\/2026/);
  assert.match(markup, /Quarta-feira · 20\/05/);
  assert.match(markup, /Quinta-feira · 21\/05/);
  assert.match(markup, /Sexta-feira · 22\/05/);
  assert.match(markup, /Contexto oficial insuficiente/);
  assert.match(markup, /disponível/);
  assert.match(markup, /limitado/);
  assert.match(markup, /Maria Silva/);
  assert.match(markup, /João Costa/);
  assert.match(markup, /18 itens/);
});

test("getPeriodPlanning preserves official aggregates and continuous day summaries", async () => {
  const originalGet = apiClient.get;

  apiClient.get = (async () => ({
    data: {
      data: [
        {
          id: 11,
          status: "placed",
          payment_status: "pending",
          slot: "manha",
          customer_name: "Maria",
          scheduled_at: "2026-05-20T08:00:00.000Z",
          total: 12,
          items: [
            {
              id: 1,
              product_id: 2,
              name: "Coxinha",
              quantity: 4,
              total: 12,
            },
          ],
        },
      ],
      filters: {
        start_date: "2026-05-20",
        end_date: "2026-05-22",
      },
      slot_labels: {
        manha: "Manhã",
      },
      selected_period_label: "20/05/2026 - 22/05/2026",
      summary: {
        orderCount: 1,
        itemQuantity: 4,
        paidCount: 0,
        attentionCount: 1,
        slotCounts: {
          manha: 1,
        },
      },
      slot_occupancy: {
        manha: {
          count: 1,
          label: "Manhã",
          context_status: "insufficient_context",
          context_reason:
            "O agregado do período combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
        },
      },
      day_summaries: {
        "2026-05-20": {
          label: "Quarta-feira · 20/05",
          orderCount: 1,
          itemQuantity: 4,
          paidCount: 0,
          attentionCount: 1,
          slotCounts: {
            manha: 1,
          },
          slotOccupancy: {
            manha: {
              count: 1,
              label: "Manhã",
              state: "disponível",
              context_status: "official",
            },
          },
        },
        "2026-05-21": {
          label: "Quinta-feira · 21/05",
          orderCount: 0,
          itemQuantity: 0,
          paidCount: 0,
          attentionCount: 0,
          slotCounts: {
            manha: 0,
          },
          slotOccupancy: {
            manha: {
              count: 0,
              label: "Manhã",
              context_status: "insufficient_context",
              context_reason:
                "Sem encomendas suficientes neste conjunto para determinar um contexto oficial único de disponibilidade.",
            },
          },
        },
      },
    },
  })) as typeof apiClient.get;

  try {
    const planning = await getPeriodPlanning("2026-05-20", "2026-05-22");

    assert.deepEqual(planning.filters, {
      startDate: "2026-05-20",
      endDate: "2026-05-22",
    });
    assert.equal(planning.selectedPeriodLabel, "20/05/2026 - 22/05/2026");
    assert.deepEqual(planning.summary, {
      orderCount: 1,
      itemQuantity: 4,
      paidCount: 0,
      attentionCount: 1,
      slotCounts: {
        manha: 1,
      },
    });
    assert.deepEqual(planning.slotOccupancy, {
      manha: {
        count: 1,
        label: "Manhã",
        state: null,
        contextStatus: "insufficient_context",
        contextReason:
          "O agregado do período combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
      },
    });
    assert.deepEqual(planning.daySummaries, {
      "2026-05-20": {
        label: "Quarta-feira · 20/05",
        orderCount: 1,
        itemQuantity: 4,
        paidCount: 0,
        attentionCount: 1,
        slotCounts: {
          manha: 1,
        },
        slotOccupancy: {
          manha: {
            count: 1,
            label: "Manhã",
            state: "disponível",
            contextStatus: "official",
            contextReason: null,
          },
        },
      },
      "2026-05-21": {
        label: "Quinta-feira · 21/05",
        orderCount: 0,
        itemQuantity: 0,
        paidCount: 0,
        attentionCount: 0,
        slotCounts: {
          manha: 0,
        },
        slotOccupancy: {
          manha: {
            count: 0,
            label: "Manhã",
            state: null,
            contextStatus: "insufficient_context",
            contextReason:
              "Sem encomendas suficientes neste conjunto para determinar um contexto oficial único de disponibilidade.",
          },
        },
      },
    });
  } finally {
    apiClient.get = originalGet;
  }
});
