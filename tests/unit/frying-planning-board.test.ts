import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFryingFlavor,
  formatNextPreparationDetails,
  getFryingOrderStatusAction,
  parsePersistedFryingPlanningFilters,
} from "@/features/frying/components/frying-planning-board";

test("formatFryingFlavor marks flavors from frozen order items", () => {
  assert.equal(formatFryingFlavor("Coxinha de Frango", true), "COXINHA DE FRANGO - CONGELADO");
  assert.equal(formatFryingFlavor("Coxinha de Frango", false), "COXINHA DE FRANGO");
});

test("formatNextPreparationDetails identifies the order and customer", () => {
  assert.equal(formatNextPreparationDetails(737, "Sónia Lopes"), "Encomenda #737 · SÓNIA LOPES");
  assert.equal(formatNextPreparationDetails(738, null), "Encomenda #738 · Cliente não identificado");
});

test("getFryingOrderStatusAction follows the operational order flow", () => {
  assert.deepEqual(getFryingOrderStatusAction("placed"), {
    label: "Aceitar",
    nextStatus: "accepted",
  });
  assert.deepEqual(getFryingOrderStatusAction("accepted"), {
    label: "Pronto",
    nextStatus: "ready",
  });
  assert.deepEqual(getFryingOrderStatusAction("ready"), {
    label: "Concluir",
    nextStatus: "done",
  });
  assert.equal(getFryingOrderStatusAction("done"), null);
});

test("parsePersistedFryingPlanningFilters restores only complete planning filters", () => {
  assert.deepEqual(
    parsePersistedFryingPlanningFilters('{"date":"2026-11-25","storeId":4}'),
    { date: "2026-11-25", storeId: 4 },
  );
  assert.equal(parsePersistedFryingPlanningFilters('{"date":"invalid","storeId":4}'), null);
  assert.equal(parsePersistedFryingPlanningFilters('{"date":"2026-11-25","storeId":0}'), null);
});
