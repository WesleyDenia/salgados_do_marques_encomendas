import { z } from "zod";

import { ORDER_PAYMENT_STATUSES, ORDER_SLOT_OPTIONS } from "@/features/orders/types";

const requiredText = (message: string) => z.string().trim().min(1, message);

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
  date: requiredText("Indique a data da encomenda.").date(
    "O formato da data deve ser AAAA-MM-DD."
  ),
  time: requiredText("Indique a hora da encomenda.").regex(
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    "O formato da hora deve ser HH:MM."
  ),
  allowScheduleException: z.coerce.boolean().optional().default(false),
  slot: z.enum(ORDER_SLOT_OPTIONS, {
    error: "Selecione o slot operacional.",
  }),
  paymentStatus: z.enum(ORDER_PAYMENT_STATUSES, {
    error: "Selecione o estado de pagamento.",
  }),
});

export type OrderCreateInput = z.input<typeof OrderCreateSchema>;

export type NormalizedOrderCreateInput = z.output<typeof OrderCreateSchema>;

export function normalizeOrderCreateInput(input: OrderCreateInput) {
  return OrderCreateSchema.parse(input);
}
