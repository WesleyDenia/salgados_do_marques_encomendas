import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeOperationalWhatsAppNumber,
  operationalSettingsSchema,
  requiresSuccessfulWhatsAppTest,
} from "@/features/settings/operational-settings-validation";

test("operationalSettingsSchema rejects WhatsApp numbers outside E.164", () => {
  const result = operationalSettingsSchema.safeParse({
    ORDER_START_TIME: "12:00",
    ORDER_END_TIME: "20:00",
    ORDER_MINIMUM_MINUTES: 60,
    ORDER_CANCEL_MINUTES: 30,
    ORDER_SCHEDULING_WINDOW_DAYS: 14,
    WHATSAPP_ORDER_TO: "912345678",
  });

  assert.equal(result.success, false);
  if (result.success) {
    assert.fail("Expected schema validation to fail for invalid WhatsApp number.");
  }
  assert.match(result.error.issues[0]?.message ?? "", /E\.164/);
});

test("operationalSettingsSchema rejects cancellation windows smaller than minimum lead time", () => {
  const result = operationalSettingsSchema.safeParse({
    ORDER_START_TIME: "12:00",
    ORDER_END_TIME: "20:00",
    ORDER_MINIMUM_MINUTES: 45,
    ORDER_CANCEL_MINUTES: 30,
    ORDER_SCHEDULING_WINDOW_DAYS: 14,
    WHATSAPP_ORDER_TO: "",
  });

  assert.equal(result.success, false);
  if (result.success) {
    assert.fail("Expected schema validation to fail for invalid cancellation window.");
  }
  assert.match(JSON.stringify(result.error.issues), /cancelamento/i);
});

test("requiresSuccessfulWhatsAppTest only blocks changed non-empty numbers", () => {
  assert.equal(requiresSuccessfulWhatsAppTest("", null), false);
  assert.equal(requiresSuccessfulWhatsAppTest(" +351912345678 ", "+351912345678"), false);
  assert.equal(requiresSuccessfulWhatsAppTest("+351912345678", null), true);
});

test("normalizeOperationalWhatsAppNumber trims incidental whitespace", () => {
  assert.equal(normalizeOperationalWhatsAppNumber("  +351912345678  "), "+351912345678");
  assert.equal(normalizeOperationalWhatsAppNumber(null), "");
});
