import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { QueryClient } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getSlotCapacityConfig,
  updateSlotCapacityConfig,
} from "@/features/planning/api";
import {
  PlanningSlotCapacityCard,
  PlanningSlotCapacityForm,
} from "@/features/planning/components/planning-slot-capacity-card";
import { invalidatePlanningCapacityQueries } from "@/features/planning/hooks/use-slot-capacity-config";
import { apiClient } from "@/lib/api/http";

test("getSlotCapacityConfig normalizes the admin payload for the planning panel", async () => {
  const originalGet = apiClient.get;

  apiClient.get = (async () => ({
    data: {
      data: {
        scope: "global",
        setting_key: "ORDER_SLOT_BASE_CAPACITY",
        slot_capacities: [
          { slot: "manha", label: "Manhã", value: 12 },
          { slot: "tarde", label: "Tarde", value: 10 },
          { slot: "noite", label: "Noite", value: 8 },
        ],
      },
    },
  })) as typeof apiClient.get;

  try {
    const config = await getSlotCapacityConfig();

    assert.deepEqual(config, {
      scope: "global",
      settingKey: "ORDER_SLOT_BASE_CAPACITY",
      slotCapacities: [
        { slot: "manha", label: "Manhã", value: 12 },
        { slot: "tarde", label: "Tarde", value: 10 },
        { slot: "noite", label: "Noite", value: 8 },
      ],
    });
  } finally {
    apiClient.get = originalGet;
  }
});

test("updateSlotCapacityConfig sends the focused admin contract", async () => {
  const originalPut = apiClient.put;
  let capturedUrl = "";
  let capturedPayload: Record<string, unknown> | null = null;

  apiClient.put = (async (url, payload) => {
    capturedUrl = String(url);
    capturedPayload = payload as Record<string, unknown>;

    return {
      data: {
        data: {
          scope: "global",
          setting_key: "ORDER_SLOT_BASE_CAPACITY",
          slot_capacities: [
            { slot: "manha", label: "Manhã", value: 4 },
            { slot: "tarde", label: "Tarde", value: 6 },
            { slot: "noite", label: "Noite", value: 2 },
          ],
        },
      },
    };
  }) as typeof apiClient.put;

  try {
    const config = await updateSlotCapacityConfig({
      manha: 4,
      tarde: 6,
      noite: 2,
    });

    assert.equal(capturedUrl, "/admin/planning/slot-capacities");
    assert.deepEqual(capturedPayload, {
      manha: 4,
      tarde: 6,
      noite: 2,
    });
    assert.equal(config.slotCapacities[0]?.value, 4);
    assert.equal(config.slotCapacities[1]?.value, 6);
    assert.equal(config.slotCapacities[2]?.value, 2);
  } finally {
    apiClient.put = originalPut;
  }
});

test("invalidatePlanningCapacityQueries refreshes config, planning datasets and slot availability caches", async () => {
  const queryClient = new QueryClient();
  const invalidated: unknown[] = [];
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);

  queryClient.invalidateQueries = (async (filters) => {
    invalidated.push(filters.queryKey);
    return originalInvalidate(filters);
  }) as typeof queryClient.invalidateQueries;

  await invalidatePlanningCapacityQueries(queryClient);

  assert.deepEqual(invalidated, [
    ["planning-admin", "slot-capacities"],
    ["planning"],
    ["slots"],
  ]);
});

test("PlanningSlotCapacityForm renders only the canonical editable slots", () => {
  const markup = renderToStaticMarkup(
    <PlanningSlotCapacityForm
      entries={[
        { slot: "manha", label: "Manhã", value: 12 },
        { slot: "tarde", label: "Tarde", value: 10 },
        { slot: "noite", label: "Noite", value: 8 },
      ]}
      values={{
        manha: "12",
        tarde: "10",
        noite: "8",
      }}
      onChange={() => undefined}
      onSubmit={(event) => event.preventDefault()}
    />,
  );

  assert.match(markup, /Capacidade base por slot/);
  assert.match(markup, /Manhã/);
  assert.match(markup, /Tarde/);
  assert.match(markup, /Noite/);
  assert.doesNotMatch(markup, /label="Sem slot"/);
});

test("PlanningSlotCapacityCard shows an explicit operational note for non-admin roles", () => {
  const markup = renderToStaticMarkup(<PlanningSlotCapacityCard role="operacional" />);

  assert.match(markup, /visível apenas para administradores/i);
  assert.doesNotMatch(markup, /Guardar capacidade base/);
});
