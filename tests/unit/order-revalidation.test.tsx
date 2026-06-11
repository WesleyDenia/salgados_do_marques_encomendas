import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  OrderDetailSheet,
} from "@/features/orders/components/orders-operational-record";

test("OrderDetailSheet renders revalidation button and handles loading state", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      order={{
        id: 123,
        status: "pending",
        canEdit: true,
        items: [],
      }}
      isRefetching={false}
      onRefetch={async () => {}}
    />,
  );

  // Check if refresh button is rendered with correct title and aria-label
  assert.match(markup, /title="Revalidar estado"/i);
  assert.match(markup, /Revalidar estado<\/span>/i);
  assert.match(markup, /lucide-refresh-ccw/i);
});

test("OrderDetailSheet disables revalidation button when isRefetching is true", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      order={{
        id: 123,
        status: "pending",
        canEdit: true,
        items: [],
      }}
      isRefetching={true}
      onRefetch={async () => {}}
    />,
  );

  // The button should be disabled and the icon should have the animate-spin class
  assert.match(markup, /<button[^>]*disabled=""[^>]*title="Revalidar estado"/i);
  assert.match(markup, /lucide-refresh-ccw[^"]*animate-spin/i);
});

test("OrderDetailSheet hides revalidation button when onRefetch is not provided", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      order={{
        id: 123,
        status: "pending",
        canEdit: true,
        items: [],
      }}
      isRefetching={false}
    />,
  );

  assert.doesNotMatch(markup, /title="Revalidar estado"/i);
});
