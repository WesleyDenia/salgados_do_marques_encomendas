import type { Order } from "@/features/orders/types";
import { formatOperationalDateTime } from "@/features/orders/utils/operational-timezone";

function formatPickupDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatPickupTime(value: string) {
  const match = value.match(/^(\d{2}:\d{2})/);

  return match?.[1] ?? value;
}

/** Preserves independently known pickup parts instead of inventing a timestamp. */
export function formatOrderPickupSchedule(order: Order, timeZone = "Europe/Lisbon") {
  const date = order.pickupDate ? formatPickupDate(order.pickupDate) : null;
  const time = order.pickupTime ? formatPickupTime(order.pickupTime) : null;

  if (date || time) {
    return `${date ?? "Indefinido"} · ${time ?? "Indefinido"}`;
  }

  return order.scheduledAt
    ? formatOperationalDateTime(order.scheduledAt, timeZone)
    : "Indefinido";
}
