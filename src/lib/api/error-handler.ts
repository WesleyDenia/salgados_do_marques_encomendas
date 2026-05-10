import axios, { AxiosError } from "axios";
import { ApiError, ApiValidationError } from "@/types/api";

type ApiErrorPayload = {
  message: string;
  code?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiErrorPayload(data: unknown): data is ApiErrorPayload {
  return isRecord(data) && typeof data.message === "string";
}

export function isApiValidationError(data: unknown): data is ApiValidationError {
  return (
    isApiErrorPayload(data) &&
    "errors" in data &&
    isRecord(data.errors)
  );
}

export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;

    // Handle Laravel Validation Errors (422)
    if (status === 422 && isApiValidationError(data)) {
      return {
        message: data.message,
        status,
        validationErrors: data.errors,
        raw: data,
      };
    }

    // Handle general backend errors
    if (isApiErrorPayload(data)) {
      return {
        message: data.message,
        status,
        code: data.code,
        raw: data,
      };
    }

    // Handle cases where no response data is available
    if (axiosError.code === "ECONNABORTED") {
      return {
        message: "O pedido expirou. Por favor, tente novamente.",
        code: "TIMEOUT",
      };
    }

    if (!axiosError.response) {
      return {
        message: "Não foi possível contactar o servidor. Verifique a sua ligação.",
        code: "NETWORK_ERROR",
      };
    }

    return {
      message: axiosError.message || "Ocorreu um erro inesperado.",
      status,
      raw: data,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: "Ocorreu um erro desconhecido.",
    raw: error,
  };
}
