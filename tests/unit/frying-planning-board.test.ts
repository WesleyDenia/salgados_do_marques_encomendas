import assert from "node:assert/strict";
import test from "node:test";

import { formatFryingFlavor } from "@/features/frying/components/frying-planning-board";

test("formatFryingFlavor marks flavors from frozen order items", () => {
  assert.equal(formatFryingFlavor("Coxinha de Frango", true), "COXINHA DE FRANGO - CONGELADO");
  assert.equal(formatFryingFlavor("Coxinha de Frango", false), "COXINHA DE FRANGO");
});
