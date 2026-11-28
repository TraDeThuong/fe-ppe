/**
 * Giới hạn độ dài mật khẩu khớp BE (SEC-22, identity-service auth.service.ts
 * updatePassword/resetPassword/register: > 128 ký tự → 400 VALIDATION_ERROR).
 * BE giới hạn để chống event-loop starvation khi bcrypt hash chuỗi quá dài.
 */
export const PASSWORD_MAX_LENGTH = 128;
