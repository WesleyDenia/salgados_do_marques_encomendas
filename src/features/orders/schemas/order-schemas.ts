import { z } from "zod";

import { ORDER_PAYMENT_STATUSES } from "@/features/orders/types";

const requiredText = (message: string) => z.string().trim().min(1, message);

const optionalPickupDate = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (value === "") {
        return true;
      }

      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (!match || value > "2100-12-31") {
        return false;
      }

      const [, year, month, day] = match.map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));

      return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    },
    "O formato da data deve ser AAAA-MM-DD.",
  );

const optionalPickupTime = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value),
    "O formato da hora deve ser HH:MM.",
  );

export const OrderCreateItemSchema = z.object({
  parentOrderItemId: z.coerce.number().int().positive().optional().nullable(),
  productId: z.coerce
    .number()
    .int("Selecione um produto válido.")
    .positive("Selecione um produto válido."),
  quantity: z.coerce
    .number()
    .int("A quantidade deve ser um número inteiro.")
    .min(1, "A quantidade deve ser maior que zero."),
  variantId: z.coerce.number().int().positive().optional().nullable(),
  flavorIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const OrderCreateSchema = z.object({
  storeId: z.coerce
    .number()
    .int("Selecione uma loja válida.")
    .positive("Selecione uma loja válida."),
  customerName: requiredText("Indique o nome do cliente."),
  customerContact: requiredText("Indique o contacto do cliente.").regex(
    /^\+?(?:[0-9][\s-]*){9,15}$/,
    "Formato de contacto inválido. Use apenas números, espaços ou hífens."
  ),
  tagIds: z.array(z.coerce.number().int().positive()).optional().default([]),
  items: z
    .array(OrderCreateItemSchema)
    .min(1, "Adicione pelo menos um item a encomenda."),
  observations: z.string().trim().optional().default(""),
  date: optionalPickupDate.default(""),
  time: optionalPickupTime.default(""),
  allowScheduleException: z.coerce.boolean().optional().default(false),
  allowPreparationCapacityOverflow: z.coerce.boolean().optional().default(false),
  paymentStatus: z.enum(ORDER_PAYMENT_STATUSES, {
    error: "Selecione o estado de pagamento.",
  }),
  paidAmount: z.coerce
    .number("Indique um valor pago válido.")
    .min(0, "O valor pago não pode ser negativo.")
    .default(0),
});

export type OrderCreateInput = z.input<typeof OrderCreateSchema>;

export type NormalizedOrderCreateInput = z.output<typeof OrderCreateSchema>;

export function normalizeOrderCreateInput(input: OrderCreateInput) {
  return OrderCreateSchema.parse(input);
}
