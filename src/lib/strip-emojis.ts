/**
 * Loại bỏ toàn bộ ký tự emoji / pictograph khỏi chuỗi hiển thị giao diện web,
 * đồng thời giữ nguyên cấu trúc xuống dòng và khoảng trắng hợp lệ.
 */
const EMOJI_STRIP_REGEX =
  /[\p{Extended_Pictographic}\u{FE00}-\u{FE0F}\u{200D}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{1F000}-\u{1FAFF}]/gu;

export function stripEmojis(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(EMOJI_STRIP_REGEX, "")
    .replace(/[^\S\r\n]{2,}/g, " ")
    .replace(/^[ \t]+|[ \t]+$/gm, "");
}

