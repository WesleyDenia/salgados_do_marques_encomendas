import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OrdersOperationalRecordEmptyState } from "@/features/orders/components/orders-operational-record";
import { createDebouncedCallback } from "@/features/orders/hooks/use-debounced-value";
import {
  buildOperationalPeriodDateRange,
  buildOrderSearchFilters,
  normalizeOrderOperationalStatus,
  normalizeOrderOperationalPeriod,
  normalizeOrderSearchPage,
  retryOrderSearchQueries,
} from "@/features/orders/hooks/use-order-search";
import {
  formatOperationalDateTime,
  getDateInputValueInTimeZone,
  getTimeInputValueInTimeZone,
} from "@/features/orders/utils/operational-timezone";

test("createDebouncedCallback only emits the latest search term", async () => {
  const received: string[] = [];
  const debouncer = createDebouncedCallback((value: string) => {
    received.push(value);
  }, 10);

  debouncer.schedule("Ma");
  debouncer.schedule("Mari");
  debouncer.schedule("Maria");

  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.deepEqual(received, ["Maria"]);
});

test("OrdersOperationalRecordEmptyState guides the user when search returns no results", () => {
  const markup = renderToStaticMarkup(
    <OrdersOperationalRecordEmptyState
      searchTerm="Maria"
      periodLabel="Hoje"
      onClear={() => undefined}
    />,
  );

  assert.match(markup, /Nenhuma encomenda encontrada/);
  assert.match(markup, /Maria/);
  assert.match(markup, /Ajuste o número, nome do cliente ou contacto/);
  assert.match(markup, /Limpar pesquisa/);
});

test("buildOperationalPeriodDateRange converts today to operational timezone boundaries", () => {
  const range = buildOperationalPeriodDateRange(
    "today",
    "Europe/Lisbon",
    new Date("2026-05-16T10:15:00.000Z"),
  );

  assert.deepEqual(range, {
    scheduledFrom: "2026-05-15T23:00:00.000Z",
    scheduledTo: "2026-05-16T22:59:59.000Z",
  });
});

test("buildOperationalPeriodDateRange converts next 7 days with full day lower bound", () => {
  const range = buildOperationalPeriodDateRange(
    "next-7-days",
    "Europe/Lisbon",
    new Date("2026-05-16T10:15:00.000Z"),
  );

  // Business change: should include the start of the current day to avoid missing early orders
  assert.deepEqual(range, {
    scheduledFrom: "2026-05-15T23:00:00.000Z",
    scheduledTo: "2026-05-23T22:59:59.000Z",
  });
});

test("buildOrderSearchFilters keeps all-period requests without date filters", () => {
  const filters = buildOrderSearchFilters(
    {
      search: "Ana",
      period: "all",
      status: "accepted",
      paymentStatus: undefined,
      slot: undefined,
      page: 2,
    },
    "Europe/Lisbon",
    new Date("2026-05-16T10:15:00.000Z"),
  );

  assert.deepEqual(filters, {
    search: "Ana",
    page: 2,
    status: "accepted",
    paymentStatus: undefined,
    slot: undefined,
    scheduledFrom: undefined,
    scheduledTo: undefined,
  });
});

test("normalizers restore valid URL values and fall back safely", () => {
  assert.equal(normalizeOrderOperationalPeriod("tomorrow"), "tomorrow");
  assert.equal(normalizeOrderOperationalPeriod("invalid"), "today");
  assert.equal(normalizeOrderSearchPage("4"), 4);
  assert.equal(normalizeOrderSearchPage("-2"), 1);
});

test("normalizeOrderOperationalStatus drops invalid values once backend labels are known", () => {
  assert.equal(
    normalizeOrderOperationalStatus("accepted", {
      placed: "Realizado",
      accepted: "Aceito",
    }),
    "accepted",
  );
  assert.equal(
    normalizeOrderOperationalStatus(" retired ", {
      placed: "Realizado",
      accepted: "Aceito",
    }),
    "",
  );
  assert.equal(normalizeOrderOperationalStatus("retired"), "retired");
});

test("retryOrderSearchQueries retries settings first when operational settings are missing", async () => {
  const calls: string[] = [];

  const result = await retryOrderSearchQueries({
    hasSettings: false,
    refetchSettings: async () => {
      calls.push("settings");

      return { isSuccess: true };
    },
    refetchOrders: async () => {
      calls.push("orders");

      return { ok: true };
    },
  });

  assert.deepEqual(calls, ["settings", "orders"]);
  assert.deepEqual(result, { ok: true });
});

test("retryOrderSearchQueries does not call orders when settings refresh still fails", async () => {
  const calls: string[] = [];

  const result = await retryOrderSearchQueries({
    hasSettings: false,
    refetchSettings: async () => {
      calls.push("settings");

      return { isSuccess: false };
    },
    refetchOrders: async () => {
      calls.push("orders");

      return { ok: true };
    },
  });

  assert.deepEqual(calls, ["settings"]);
  assert.deepEqual(result, { isSuccess: false });
});

test("operational timezone helpers format and prefill using the configured store timezone", () => {
  const scheduledAt = "2026-05-20T09:30:00.000Z";

  assert.equal(
    formatOperationalDateTime(scheduledAt, "Europe/Lisbon"),
    "20/05/2026, 10:30",
  );
  assert.equal(
    getDateInputValueInTimeZone(scheduledAt, "Europe/Lisbon"),
    "2026-05-20",
  );
  assert.equal(
    getTimeInputValueInTimeZone(scheduledAt, "Europe/Lisbon"),
    "10:30",
  );
});
