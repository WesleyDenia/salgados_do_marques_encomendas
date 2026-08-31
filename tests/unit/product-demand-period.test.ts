import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductDemandDateRange,
  isValidDateInputValue,
  normalizeProductDemandPeriod,
} from "@/features/dashboard/utils/product-demand-period";

test("buildProductDemandDateRange maps stock presets to local date ranges", () => {
  const now = new Date("2026-05-16T10:15:00.000Z");

  assert.deepEqual(
    buildProductDemandDateRange("today", "Europe/Lisbon", "", "", now),
    {
      startDate: "2026-05-16",
      endDate: "2026-05-16",
    },
  );

  assert.deepEqual(
    buildProductDemandDateRange("tomorrow", "Europe/Lisbon", "", "", now),
    {
      startDate: "2026-05-17",
      endDate: "2026-05-17",
    },
  );

  assert.deepEqual(
    buildProductDemandDateRange("next-7-days", "Europe/Lisbon", "", "", now),
    {
      startDate: "2026-05-16",
      endDate: "2026-05-23",
    },
  );
});

test("buildProductDemandDateRange preserves custom date input values", () => {
  assert.deepEqual(
    buildProductDemandDateRange(
      "custom",
      "Europe/Lisbon",
      "2026-06-01",
      "2026-06-05",
      new Date("2026-05-16T10:15:00.000Z"),
    ),
    {
      startDate: "2026-06-01",
      endDate: "2026-06-05",
    },
  );
});

test("stock demand period helpers reject unexpected periods and malformed dates", () => {
  assert.equal(normalizeProductDemandPeriod("tomorrow"), "tomorrow");
  assert.equal(normalizeProductDemandPeriod("all"), "today");
  assert.equal(normalizeProductDemandPeriod("unexpected"), "today");
  assert.equal(normalizeProductDemandPeriod(null), "today");

  assert.equal(isValidDateInputValue("2026-02-28"), true);
  assert.equal(isValidDateInputValue("2026-02-31"), false);
  assert.equal(isValidDateInputValue("2026-2-3"), false);
  assert.equal(isValidDateInputValue(""), false);
});
