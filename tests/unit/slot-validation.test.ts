import assert from "node:assert/strict";
import test from "node:test";

import { validateSlotSelection } from "@/features/slots/slot-validation";
import { type SlotCapacity } from "@/features/slots/types";

test("validateSlotSelection returns null when slot is disponível", () => {
  const capacities: SlotCapacity[] = [
    { slot: "manha", state: "disponível" },
    { slot: "tarde", state: "limitado" },
    { slot: "noite", state: "bloqueado" },
  ];

  const error = validateSlotSelection("manha", capacities);
  assert.equal(error, null);
});

test("validateSlotSelection returns null when slot is limitado", () => {
  const capacities: SlotCapacity[] = [
    { slot: "manha", state: "disponível" },
    { slot: "tarde", state: "limitado" },
    { slot: "noite", state: "bloqueado" },
  ];

  const error = validateSlotSelection("tarde", capacities);
  assert.equal(error, null);
});

test("validateSlotSelection returns error message when slot is bloqueado", () => {
  const capacities: SlotCapacity[] = [
    { slot: "manha", state: "disponível" },
    { slot: "tarde", state: "limitado" },
    { slot: "noite", state: "bloqueado" },
  ];

  const error = validateSlotSelection("noite", capacities);
  assert.equal(error, "O slot selecionado não tem capacidade disponível. Por favor, escolha outro slot.");
});

test("validateSlotSelection returns null when slot is not found in capacities", () => {
  const capacities: SlotCapacity[] = [];

  const error = validateSlotSelection("manha", capacities);
  assert.equal(error, null);
});
