import axios, { AxiosError } from "axios";
import { ApiError, ApiValidationError } from "@/types/api";

export function isApiValidationError(data: any): data is ApiValidationError {
  return (
    data &&
    typeof data.message === "string" &&
    data.errors &&
    typeof data.errors === "object"
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
    if (data && typeof data === "object" && "message" in data) {
      return {
        message: (data as any).message,
        status,
        code: (data as any).code,
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
