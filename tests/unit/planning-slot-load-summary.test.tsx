import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PlanningSlotLoadSummary } from "@/features/planning/components/planning-slot-load-summary";

test("PlanningSlotLoadSummary renders official slot counts in canonical order with safe label fallback", () => {
  const markup = renderToStaticMarkup(
    <PlanningSlotLoadSummary
      title="Carga agregada por slot"
      description="Leitura oficial do intervalo selecionado."
      slotLabels={{
        manha: "Manhã",
        tarde: "Tarde",
        sem_slot: "Sem slot",
      }}
      groups={[
        {
          id: "weekly-total",
          label: "Total da semana",
          slotCounts: {
            madrugada: 2,
            tarde: 1,
            manha: 3,
            sem_slot: 4,
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
});

test("PlanningSlotLoadSummary warns when the official aggregate is missing canonical slot counts", () => {
  const markup = renderToStaticMarkup(
    <PlanningSlotLoadSummary
      title="Carga agregada por slot"
      description="Leitura oficial do intervalo selecionado."
      slotLabels={{
        manha: "Manhã",
        tarde: "Tarde",
      }}
      groups={[
        {
          id: "weekly-total",
          label: "Total da semana",
          slotCounts: {
            manha: 3,
            tarde: 1,
          },
        },
      ]}
    />,
  );

  assert.match(markup, /Agregado oficial incompleto/);
  assert.doesNotMatch(markup, /Noite/);
  assert.doesNotMatch(markup, /Sem slot/);
});
