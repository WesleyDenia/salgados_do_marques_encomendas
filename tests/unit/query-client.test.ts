import { describe, it } from "node:test";
import assert from "node:assert";
import { queryClient } from "../../src/lib/api/query-client";
import { ApiError } from "../../src/types/api";

describe("QueryClient Configuration", () => {
  it("should have correct default options", () => {
    const options = queryClient.getDefaultOptions();
    assert.strictEqual(options.queries?.staleTime, 30000);
    assert.strictEqual(options.mutations?.retry, false);
  });

  it("should not retry on client errors (401, 403, 404, 422)", () => {
    const options = queryClient.getDefaultOptions();
    const retryFn = options.queries?.retry as (failureCount: number, error: ApiError) => boolean;

    assert.strictEqual(retryFn(1, { message: "Unauthorized", status: 401 }), false);
    assert.strictEqual(retryFn(1, { message: "Forbidden", status: 403 }), false);
    assert.strictEqual(retryFn(1, { message: "Not Found", status: 404 }), false);
    assert.strictEqual(retryFn(1, { message: "Validation Error", status: 422 }), false);
    
    // Should retry on other errors
    assert.strictEqual(retryFn(1, { message: "Server Error", status: 500 }), true);
    assert.strictEqual(retryFn(3, { message: "Server Error", status: 500 }), false);
  });
});
