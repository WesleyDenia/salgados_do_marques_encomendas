import { describe, it } from "node:test";
import assert from "node:assert";
import axios from "axios";
import { normalizeError } from "../../src/lib/api/error-handler";

describe("normalizeError", () => {
  it("should normalize 422 validation errors", () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          message: "The given data was invalid.",
          errors: {
            email: ["The email field is required."],
          },
        },
      },
    };

    // Mocking axios.isAxiosError
    const originalIsAxiosError = axios.isAxiosError;
    axios.isAxiosError = (err: any): err is any => true;

    try {
      const normalized = normalizeError(error);
      assert.strictEqual(normalized.status, 422);
      assert.strictEqual(normalized.message, "The given data was invalid.");
      assert.deepStrictEqual(normalized.validationErrors, {
        email: ["The email field is required."],
      });
    } finally {
      axios.isAxiosError = originalIsAxiosError;
    }
  });

  it("should normalize 401 unauthorized errors", () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          message: "Unauthenticated.",
        },
      },
    };

    const originalIsAxiosError = axios.isAxiosError;
    axios.isAxiosError = (err: any): err is any => true;

    try {
      const normalized = normalizeError(error);
      assert.strictEqual(normalized.status, 401);
      assert.strictEqual(normalized.message, "Unauthenticated.");
    } finally {
      axios.isAxiosError = originalIsAxiosError;
    }
  });

  it("should handle network errors", () => {
    const error = {
      isAxiosError: true,
      message: "Network Error",
      response: undefined,
    };

    const originalIsAxiosError = axios.isAxiosError;
    axios.isAxiosError = (err: any): err is any => true;

    try {
      const normalized = normalizeError(error);
      assert.strictEqual(normalized.code, "NETWORK_ERROR");
      assert.match(normalized.message, /ligação/);
    } finally {
      axios.isAxiosError = originalIsAxiosError;
    }
  });

  it("should handle timeouts", () => {
    const error = {
      isAxiosError: true,
      code: "ECONNABORTED",
      response: undefined,
    };

    const originalIsAxiosError = axios.isAxiosError;
    axios.isAxiosError = (err: any): err is any => true;

    try {
      const normalized = normalizeError(error);
      assert.strictEqual(normalized.code, "TIMEOUT");
      assert.match(normalized.message, /expirou/);
    } finally {
      axios.isAxiosError = originalIsAxiosError;
    }
  });
});
