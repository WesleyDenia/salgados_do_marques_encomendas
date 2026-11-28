import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFryingFlavor,
  formatNextPreparationDetails,
  getFryingOrderStatusAction,
} from "@/features/frying/components/frying-planning-board";

test("formatFryingFlavor marks flavors from frozen order items", () => {
  assert.equal(formatFryingFlavor("Coxinha de Frango", true), "COXINHA DE FRANGO - CONGELADO");
  assert.equal(formatFryingFlavor("Coxinha de Frango", false), "COXINHA DE FRANGO");
});

test("formatNextPreparationDetails identifies the order and customer", () => {
  assert.equal(formatNextPreparationDetails(737, "Sónia Lopes"), "Encomenda #737 · SÓNIA LOPES");
  assert.equal(formatNextPreparationDetails(738, null), "Encomenda #738 · Cliente não identificado");
});

test("getFryingOrderStatusAction advances an order from ready to done", () => {
  assert.deepEqual(getFryingOrderStatusAction(), {
    label: "Pronto",
    nextStatus: "ready",
  });
  assert.deepEqual(getFryingOrderStatusAction("ready"), {
    label: "Concluir",
    nextStatus: "done",
  });
  assert.equal(getFryingOrderStatusAction("done"), null);
});
