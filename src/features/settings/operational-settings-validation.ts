import * as z from "zod";

export const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
export const E164_PHONE_MESSAGE = "O número WhatsApp deve estar no formato E.164.";

export const operationalSettingsSchema = z
  .object({
    ORDER_START_TIME: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:mm inválido"),
    ORDER_END_TIME: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:mm inválido"),
    ORDER_MINIMUM_MINUTES: z.number().min(0),
    ORDER_CANCEL_MINUTES: z.number().min(0),
    ORDER_SCHEDULING_WINDOW_DAYS: z.number().min(1),
    WHATSAPP_ORDER_TO: z
      .string()
      .trim()
      .refine((value) => value === "" || E164_PHONE_REGEX.test(value), E164_PHONE_MESSAGE)
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

export function normalizeOperationalWhatsAppNumber(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function requiresSuccessfulWhatsAppTest(
  currentNumber: string | null | undefined,
  testedNumber: string | null | undefined,
): boolean {
  const normalizedCurrent = normalizeOperationalWhatsAppNumber(currentNumber);

  if (normalizedCurrent === "") {
    return false;
  }

  return normalizedCurrent !== normalizeOperationalWhatsAppNumber(testedNumber);
}
