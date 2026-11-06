"use client";

/**
 * Trình trợ giúp tải xuống Blob nhị phân trên trình duyệt bằng thẻ neo ngầm.
 * Tự động tạo và thu hồi Object URL để tránh rò rỉ bộ nhớ (memory leak).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || !document) {
    return;
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.style.display = "none";
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();

  // Dọn dẹp DOM và giải phóng Object URL
  window.setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, 100);
}
