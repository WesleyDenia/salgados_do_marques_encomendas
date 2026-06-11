import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PlanningSlotOccupancySummary } from "@/features/planning/components/planning-slot-occupancy-summary";

test("PlanningSlotOccupancySummary renders official textual states and context messages in canonical order", () => {
  const markup = renderToStaticMarkup(
    <PlanningSlotOccupancySummary
      title="Ocupação oficial por slot"
      description="Leitura oficial do conjunto."
      slotLabels={{
        manha: "Manhã",
        tarde: "Tarde",
        noite: "Noite",
        sem_slot: "Sem slot",
      }}
      groups={[
        {
          id: "daily-total",
          label: "Total do dia",
          slotOccupancy: {
            madrugada: {
              count: 1,
              label: "Madrugada",
              state: null,
              contextStatus: "insufficient_context",
              contextReason: "Slot adicional sem contexto oficial único.",
            },
            tarde: {
              count: 2,
              label: "Tarde",
              state: "limitado",
              contextStatus: "official",
              contextReason: null,
            },
            manha: {
              count: 3,
              label: "Manhã",
              state: "disponível",
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
      ]}
    />,
  );

  const manhaIndex = markup.indexOf("Manhã");
  const tardeIndex = markup.indexOf("Tarde");
  const semSlotIndex = markup.indexOf("Sem slot");
  const madrugadaIndex = markup.indexOf("Madrugada");

  assert.notEqual(manhaIndex, -1);
  assert.notEqual(tardeIndex, -1);
  assert.notEqual(semSlotIndex, -1);
  assert.notEqual(madrugadaIndex, -1);
  assert.ok(manhaIndex < tardeIndex);
  assert.ok(tardeIndex < semSlotIndex);
  assert.ok(semSlotIndex < madrugadaIndex);
  assert.match(markup, /disponível/);
  assert.match(markup, /limitado/);
  assert.match(markup, /Sem estado oficial/);
  assert.match(markup, /Contexto oficial insuficiente/);
});
