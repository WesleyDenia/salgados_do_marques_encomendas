import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getDailyPlanning, getWeeklyPlanning } from "@/features/planning/api";
import { PlanningDailyBoard } from "@/features/planning/components/planning-daily-view";
import { PlanningWeeklyBoard } from "@/features/planning/components/planning-weekly-view";
import { planningKeys } from "@/features/planning/hooks/use-daily-planning";
import {
  buildPlanningDayFromWeekStart,
  buildPlanningDayDateRange,
  buildPlanningOfficialDayGroups,
  buildPlanningWeekDateRange,
  normalizePlanningDay,
  normalizePlanningWeekStart,
  resolvePlanningPeriodState,
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

test("normalizePlanningWeekStart snaps the selected date to the operational Monday", () => {
  assert.equal(
    normalizePlanningWeekStart(undefined, "Europe/Lisbon", new Date("2026-05-20T00:30:00.000Z")),
    "2026-05-18",
  );
  assert.equal(
    normalizePlanningWeekStart("2026-05-20", "Europe/Lisbon", new Date("2026-05-20T00:30:00.000Z")),
    "2026-05-18",
  );
  assert.equal(
    normalizePlanningWeekStart("2026-05-18", "Europe/Lisbon", new Date("2026-05-20T00:30:00.000Z")),
    "2026-05-18",
  );
});

test("buildPlanningWeekDateRange converts a DST-crossing operational week to UTC boundaries", () => {
  assert.deepEqual(buildPlanningWeekDateRange("2026-10-19", "Europe/Lisbon"), {
    scheduledFrom: "2026-10-18T23:00:00.000Z",
    scheduledTo: "2026-10-25T23:59:59.000Z",
  });
});

test("planningKeys isolates weekly cache entries from daily cache entries", () => {
  assert.deepEqual(planningKeys.daily("2026-05-20"), ["planning", "daily", "2026-05-20"]);
  assert.deepEqual(planningKeys.weekly("2026-05-18"), [
    "planning",
    "weekly",
    "2026-05-18",
  ]);
});

test("resolvePlanningPeriodState keeps week view anchored to the selected operational week", () => {
  assert.deepEqual(
    resolvePlanningPeriodState(
      "week",
      undefined,
      "2026-06-01",
      "Europe/Lisbon",
      new Date("2026-05-20T00:30:00.000Z"),
    ),
    {
      view: "week",
      day: "2026-06-01",
      weekStart: "2026-06-01",
    },
  );
  assert.deepEqual(
    resolvePlanningPeriodState(
      "day",
      "2026-05-21",
      "2026-05-04",
      "Europe/Lisbon",
      new Date("2026-05-20T00:30:00.000Z"),
    ),
    {
      view: "day",
      day: "2026-05-21",
      weekStart: "2026-05-18",
    },
  );
});

test("buildPlanningDayFromWeekStart preserves the weekday when moving between weeks", () => {
  assert.equal(
    buildPlanningDayFromWeekStart("2026-05-21", "2026-05-18", "2026-05-25"),
    "2026-05-28",
  );
  assert.equal(
    buildPlanningDayFromWeekStart("2026-05-30", "2026-05-18", "2026-06-01"),
    "2026-06-01",
  );
});

test("PlanningDailyBoard renders the official slot occupancy and the full day order list", () => {
  const markup = renderToStaticMarkup(
    <PlanningDailyBoard
      day="2026-05-20"
      timeZone="Europe/Lisbon"
      statusLabels={{
        accepted: "Aceite",
        placed: "Realizado",
      }}
      data={{
        filters: { day: "2026-05-20" },
        selectedDayLabel: "20/05/2026",
        slotLabels: {
          manha: "Manhã",
          tarde: "Tarde",
          noite: "Noite",
          sem_slot: "Sem slot",
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
            sem_slot: 1,
          },
        },
        slotOccupancy: {
          manha: {
            count: 1,
            label: "Manhã",
            state: "disponível",
            contextStatus: "official",
            contextReason: null,
          },
          tarde: {
            count: 1,
            label: "Tarde",
            state: "limitado",
            contextStatus: "official",
            contextReason: null,
          },
          noite: {
            count: 0,
            label: "Noite",
            state: "bloqueado",
            contextStatus: "official",
            contextReason: null,
          },
          sem_slot: {
            count: 1,
            label: "Sem slot",
            state: null,
            contextStatus: "not_applicable",
            contextReason:
              "Sem slot atribuído não representa uma janela oficial de capacidade.",
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
  assert.match(markup, /Carga agregada por slot/);
  assert.match(markup, /A vista diária usa o contrato oficial embutido em/);
  assert.match(markup, /Sem slot/);
  assert.match(markup, /disponível/);
  assert.match(markup, /limitado/);
  assert.match(markup, /bloqueado/);
  assert.match(markup, /Sem estado oficial/);
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
      data={{
        filters: { day: "2026-05-20" },
        selectedDayLabel: "20/05/2026",
        slotLabels: {},
        summary: null,
        slotOccupancy: {
          manha: {
            count: 1,
            label: "Manhã",
            state: null,
            contextStatus: "insufficient_context",
            contextReason:
              "O conjunto atual inclui várias lojas; o backend não afirma um estado oficial agregado de disponibilidade sem contexto único.",
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
        ],
      }}
    />,
  );

  assert.match(markup, /O backend não devolveu um resumo oficial do dia/);
  assert.match(markup, /Contexto oficial insuficiente/);
  assert.doesNotMatch(markup, /A pedir atenção/);
});

test("PlanningDailyBoard exposes the empty day state explicitly", () => {
  const markup = renderToStaticMarkup(
    <PlanningDailyBoard
      day="2026-05-21"
      timeZone="Europe/Lisbon"
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
        slotOccupancy: {},
        orders: [],
      }}
    />,
  );

  assert.match(markup, /Sem encomendas para este dia operacional/);
  assert.match(markup, /21\/05\/2026/);
});

test("PlanningWeeklyBoard renders the weekly distribution and official daily aggregates", () => {
  const markup = renderToStaticMarkup(
    <PlanningWeeklyBoard
      timeZone="Europe/Lisbon"
      weekStart="2026-05-18"
      statusLabels={{
        accepted: "Aceite",
        placed: "Realizado",
      }}
      data={{
        filters: { weekStart: "2026-05-18" },
        selectedWeekLabel: "18/05/2026 - 24/05/2026",
        slotLabels: {
          manha: "Manhã",
          tarde: "Tarde",
          noite: "Noite",
          sem_slot: "Sem slot",
        },
        summary: {
          orderCount: 3,
          itemQuantity: 20,
          paidCount: 1,
          attentionCount: 3,
          slotCounts: {
            manha: 1,
            tarde: 1,
            noite: 1,
            sem_slot: 1,
          },
        },
        slotOccupancy: {
          manha: {
            count: 1,
            label: "Manhã",
            state: null,
            contextStatus: "insufficient_context",
            contextReason:
              "O agregado semanal combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
          },
          tarde: {
            count: 1,
            label: "Tarde",
            state: null,
            contextStatus: "insufficient_context",
            contextReason:
              "O agregado semanal combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
          },
          noite: {
            count: 1,
            label: "Noite",
            state: null,
            contextStatus: "insufficient_context",
            contextReason:
              "O agregado semanal combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
          },
          sem_slot: {
            count: 1,
            label: "Sem slot",
            state: null,
            contextStatus: "not_applicable",
            contextReason:
              "Sem slot atribuído não representa uma janela oficial de capacidade.",
          },
        },
        daySummaries: {
          "2026-05-18": {
            label: "Segunda-feira · 18/05",
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
          "2026-05-19": {
            label: "Terça-feira · 19/05",
            orderCount: 2,
            itemQuantity: 14,
            paidCount: 1,
            attentionCount: 2,
            slotCounts: {
              manha: 1,
              tarde: 1,
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
              tarde: {
                count: 1,
                label: "Tarde",
                state: "limitado",
                contextStatus: "official",
                contextReason: null,
              },
            },
          },
          "2026-05-22": {
            label: "Sexta-feira · 22/05",
            orderCount: 1,
            itemQuantity: 6,
            paidCount: 0,
            attentionCount: 1,
            slotCounts: {
              manha: 0,
              tarde: 0,
              noite: 1,
              sem_slot: 1,
            },
            slotOccupancy: {
              noite: {
                count: 1,
                label: "Noite",
                state: "bloqueado",
                contextStatus: "official",
                contextReason: null,
              },
              sem_slot: {
                count: 1,
                label: "Sem slot",
                state: null,
                contextStatus: "not_applicable",
                contextReason:
                  "Sem slot atribuído não representa uma janela oficial de capacidade.",
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
            scheduledAt: "2026-05-19T08:30:00.000Z",
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
            scheduledAt: "2026-05-19T14:00:00.000Z",
            total: 18,
            notes: null,
            items: [
              {
                id: 2,
                productId: 14,
                productName: "Rissole",
                quantity: 2,
                total: 18,
              },
            ],
            store: {
              id: 3,
              name: "Loja Centro",
            },
          },
          {
            id: 44,
            status: "placed",
            paymentStatus: "partial",
            slot: "noite",
            customerName: "Ana Cruz",
            scheduledAt: "2026-05-22T18:00:00.000Z",
            total: 12,
            notes: null,
            items: [
              {
                id: 3,
                productId: 18,
                productName: "Empada",
                quantity: 6,
                total: 12,
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

  assert.match(markup, /Planeamento semanal/);
  assert.match(markup, /Total da semana/);
  assert.match(markup, /Carga agregada por slot/);
  assert.match(markup, /Ocupação oficial por slot/);
  assert.match(markup, /18\/05\/2026 - 24\/05\/2026/);
  assert.match(markup, /Segunda-feira · 18\/05/);
  assert.match(markup, /Terça-feira · 19\/05/);
  assert.match(markup, /Sexta-feira · 22\/05/);
  assert.match(markup, /Sem slot/);
  assert.match(markup, /disponível/);
  assert.match(markup, /limitado/);
  assert.match(markup, /bloqueado/);
  assert.match(markup, /Contexto oficial insuficiente/);
  assert.match(markup, /Maria Silva/);
  assert.match(markup, /Ana Cruz/);
  assert.match(markup, /20 itens/);
});

test("buildPlanningOfficialDayGroups preserves only backend-provided daily aggregates", () => {
  assert.deepEqual(
    buildPlanningOfficialDayGroups({
      "2026-05-19": {
        label: "Terça-feira · 19/05",
        orderCount: 2,
        itemQuantity: 14,
        paidCount: 1,
        attentionCount: 2,
        slotCounts: {
          manha: 1,
          tarde: 1,
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
    }),
    [
      {
        dayKey: "2026-05-19",
        summary: {
          label: "Terça-feira · 19/05",
          orderCount: 2,
          itemQuantity: 14,
          paidCount: 1,
          attentionCount: 2,
          slotCounts: {
            manha: 1,
            tarde: 1,
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
      },
    ],
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
      slot_occupancy: {
        manha: {
          count: 1,
          label: "Manhã",
          state: "disponível",
          context_status: "official",
          context_reason: null,
        },
        sem_slot: {
          count: 0,
          label: "Sem slot",
          context_status: "not_applicable",
        },
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
    assert.deepEqual(planning.slotOccupancy, {
      manha: {
        count: 1,
        label: "Manhã",
        state: "disponível",
        contextStatus: "official",
        contextReason: null,
      },
      sem_slot: {
        count: 0,
        label: "Sem slot",
        state: null,
        contextStatus: "not_applicable",
        contextReason: null,
      },
    });
  } finally {
    apiClient.get = originalGet;
  }
});

test("getWeeklyPlanning preserves official aggregates and weekly day summaries", async () => {
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
          scheduled_at: "2026-05-19T08:00:00.000Z",
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
        week_start: "2026-05-18",
      },
      slot_labels: {
        manha: "Manhã",
      },
      selected_week_label: "18/05/2026 - 24/05/2026",
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
          state: null,
          context_status: "insufficient_context",
          context_reason:
            "O agregado semanal combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
        },
      },
      day_summaries: {
        "2026-05-19": {
          label: "Terça-feira · 19/05",
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
      },
    },
  })) as typeof apiClient.get;

  try {
    const planning = await getWeeklyPlanning("2026-05-18");

    assert.equal(planning.filters.weekStart, "2026-05-18");
    assert.equal(planning.selectedWeekLabel, "18/05/2026 - 24/05/2026");
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
          "O agregado semanal combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
      },
    });
    assert.deepEqual(planning.daySummaries, {
      "2026-05-19": {
        label: "Terça-feira · 19/05",
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
    });
  } finally {
    apiClient.get = originalGet;
  }
});
