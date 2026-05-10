import axios from "axios";
import { normalizeError } from "./error-handler";

export const API_PROXY_PREFIX = "/api/v1";

export const apiClient = axios.create({
  baseURL: API_PROXY_PREFIX,
  timeout: 30000, // 30 seconds
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Response Interceptor for normalization and session expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeError(error);

    // Only redirect if we are in the browser
    if (typeof window !== "undefined") {
      // Handle session expiry (401 Unauthorized or 419 Page Expired)
      if (normalized.status === 401 || normalized.status === 419) {
        // Redirect to signin with return URL if possible
        const currentPath = window.location.pathname;
        if (currentPath !== "/signin" && currentPath !== "/") {
          window.location.href = `/signin?callbackUrl=${encodeURIComponent(currentPath)}`;
        }
      }

      // Handle 403 Forbidden (Authenticated but lacks permissions)
      if (normalized.status === 403) {
        window.location.href = "/unauthorized";
      }
    }

    return Promise.reject(normalized);
  }
);
