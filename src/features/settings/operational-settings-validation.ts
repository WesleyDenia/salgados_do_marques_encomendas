import * as z from "zod";

export const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
export const WHATSAPP_RECIPIENT_REGEX = /^(?:\+[1-9]\d{7,14}|[A-Za-z0-9._:-]+@g\.us)$/;
export const WHATSAPP_RECIPIENT_MESSAGE = "O destino WhatsApp deve estar no formato E.164 ou terminar com @g.us.";

export const operationalSettingsSchema = z
  .object({
    ORDER_START_TIME: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:mm inválido"),
    ORDER_END_TIME: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:mm inválido"),
    ORDER_MINIMUM_MINUTES: z.number().min(0),
    ORDER_CANCEL_MINUTES: z.number().min(0),
    ORDER_SCHEDULING_WINDOW_DAYS: z.number().min(1),
    ORDER_SLOT_MODE: z.enum(["periodo", "horario"]).default("periodo"),
    WHATSAPP_ORDER_TO: z
      .string()
      .trim()
      .refine((value) => value === "" || WHATSAPP_RECIPIENT_REGEX.test(value), WHATSAPP_RECIPIENT_MESSAGE)
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ORDER_START_TIME >= data.ORDER_END_TIME) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A hora de fim deve ser posterior à hora de início",
        path: ["ORDER_END_TIME"],
      });
    }

    if (data.ORDER_CANCEL_MINUTES < data.ORDER_MINIMUM_MINUTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A janela de cancelamento não pode ser inferior à antecedência mínima",
        path: ["ORDER_CANCEL_MINUTES"],
      });
    }
  });

export type OperationalSettingsFormValues = z.infer<typeof operationalSettingsSchema>;

export function normalizeOperationalWhatsAppRecipient(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export const normalizeOperationalWhatsAppNumber = normalizeOperationalWhatsAppRecipient;

export function requiresSuccessfulWhatsAppTest(
  currentRecipient: string | null | undefined,
  testedRecipient: string | null | undefined,
): boolean {
  const normalizedCurrent = normalizeOperationalWhatsAppRecipient(currentRecipient);

  if (normalizedCurrent === "") {
    return false;
  }

  return normalizedCurrent !== normalizeOperationalWhatsAppRecipient(testedRecipient);
}
