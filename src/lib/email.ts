/**
 * Chuẩn hóa email dán/nhập từ IME trước khi validate: browser KHÔNG strip
 * full-width ＠ (U+FF20) như đã strip ZWSP/full-width chấm → zod reject dù
 * người dùng thấy email "đúng". Chrome chỉ xóa ZWSP (U+200B) và ．(U+FF0E)
 * khỏi input type=email; Firefox/Safari giữ nguyên cả những ký tự này.
 */
export function normalizeEmail(value: string): string {
  return value
    .replace(/＠/g, "@")
    .replace(/．/g, ".")
    .replace(/　/g, " ")
    .replace(/[​-‏⁠﻿]/g, "")
    .trim();
}
