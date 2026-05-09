"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { getAuthErrorMessage, loginWithPanelSession } from "@/features/auth/api";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/auth-schemas";

type LoginFormProps = {
  disabled?: boolean;
};

export function LoginForm({ disabled = false }: LoginFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const validation = loginSchema.safeParse(values);

    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0];

        if (fieldName === "email" || fieldName === "password") {
          setError(fieldName, {
            message: issue.message,
            type: "manual",
          });
        }
      }

      return;
    }

    try {
      await loginWithPanelSession(validation.data);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          disabled={disabled || isSubmitting}
          className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="nome@empresa.pt"
          {...register("email")}
        />
        {errors.email?.message ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Palavra-passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={disabled || isSubmitting}
          className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="Introduza a sua palavra-passe"
          {...register("password")}
        />
        {errors.password?.message ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}

      <Button
        className="h-11 w-full rounded-2xl"
        type="submit"
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? "A autenticar..." : "Entrar no painel"}
      </Button>
    </form>
  );
}
