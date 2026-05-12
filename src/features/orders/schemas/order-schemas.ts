import { z } from "zod/v4";

import { ORDER_PAYMENT_STATUSES, ORDER_SLOT_OPTIONS } from "@/features/orders/types";

const requiredText = (message: string) => z.string().trim().min(1, message);

export const OrderCreateItemSchema = z.object({
  productId: z.coerce
    .number()
    .int("Selecione um produto válido.")
    .positive("Selecione um produto válido."),
  quantity: z.coerce
    .number()
    .int("A quantidade deve ser um numero inteiro.")
    .min(1, "A quantidade deve ser maior que zero."),
});

export const OrderCreateSchema = z.object({
  storeId: z.coerce
    .number()
    .int("Selecione uma loja válida.")
    .positive("Selecione uma loja válida."),
  customerName: requiredText("Indique o nome do cliente."),
  customerContact: requiredText("Indique o contacto do cliente."),
  items: z
    .array(OrderCreateItemSchema)
    .min(1, "Adicione pelo menos um item a encomenda."),
  observations: z.string().trim().optional().default(""),
  date: requiredText("Indique a data da encomenda."),
  time: requiredText("Indique a hora da encomenda."),
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
