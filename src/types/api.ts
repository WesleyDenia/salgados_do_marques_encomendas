export interface ApiValidationError {
  message: string;
  errors: Record<string, string[]>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  validationErrors?: Record<string, string[]>;
  raw?: unknown;
}

export interface ApiMeta {
  current_page?: number;
  from?: number;
  last_page?: number;
  links?: any[];
  path?: string;
  per_page?: number;
  to?: number;
  total?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  meta?: ApiMeta;
  message?: string;
}
