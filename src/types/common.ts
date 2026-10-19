/**
 * Nguồn: smart-ppe-identity-service/src/common/errors/error-code.ts
 * Dùng const object thay vì TS enum để tránh code thừa khi bundle.
 */
export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USER_INACTIVE: "USER_INACTIVE",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TWO_FACTOR_INVALID_CODE: "TWO_FACTOR_INVALID_CODE",
  TWO_FACTOR_ALREADY_ENABLED: "TWO_FACTOR_ALREADY_ENABLED",
  GOOGLE_AUTH_FAILED: "GOOGLE_AUTH_FAILED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  BAD_REQUEST: "BAD_REQUEST",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  CAPTCHA_REQUIRED: "CAPTCHA_REQUIRED",
  CAPTCHA_INVALID: "CAPTCHA_INVALID",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  SYSTEM_MAINTENANCE: "SYSTEM_MAINTENANCE",
  GATEWAY_REQUIRED: "GATEWAY_REQUIRED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface FieldError {
  field: string;
  message: string;
}

/** Body lỗi chuẩn của mọi microservice (error middleware dùng chung) */
export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
  errors?: FieldError[];
}
