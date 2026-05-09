import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Introduza o e-mail.")
    .email("Introduza um e-mail válido."),
  password: z.string().min(1, "Introduza a palavra-passe."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
