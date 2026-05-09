import axios from "axios";

export const API_PROXY_PREFIX = "/api/v1";

export const apiClient = axios.create({
  baseURL: API_PROXY_PREFIX,
  headers: {
    Accept: "application/json",
  },
});
