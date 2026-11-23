import type { NormalizedBox } from "./notification-enrichment";

/**
 * Kết quả đặc trưng hình ảnh (Perceptual Fingerprint) của 1 ảnh bằng chứng PPE.
 * Thiết kế theo interface mở để sau này có thể bổ sung embedding vector từ ONNX Runtime Web.
 */
export interface VisualFingerprint {
  /** Cache key ổn định (ưu tiên evidenceChecksum, fallback evidenceId hoặc incidentId) */
  id: string;
  /** 64-bit Difference Hash dạng chuỗi hex 16 ký tự */
  dHash: string;
  /** Biểu đồ phân bố màu RGB 4x4x4 = 64 bins đã chuẩn hóa L2 */
  histogram: number[];
  /** Thời điểm tính toán (epoch ms) */
  computedAt: number;
  /** Phiên bản thuật toán */
  method: "dhash-hist-v1";
}

export interface VisualSimilarityResult {
  hammingDistance: number;
  /** Độ tương đồng cấu trúc dHash trong [0..1] */
  dHashSimilarity: number;
  /** Độ tương đồng màu sắc histogram Cosine trong [0..1] */
  histogramSimilarity: number;
  /** Điểm tổng hợp có trọng số trong [0..1] */
  combinedScore: number;
  isMatch: boolean;
}

export interface VisualSimilarityThresholds {
  /** Số bit khác biệt tối đa trên 64 bit dHash (mặc định 10 ~= tương đồng >= 84%) */
  maxHamming?: number;
  /** Độ tương đồng Cosine tối thiểu của Color Histogram (mặc định 0.82) */
  minHistogramSim?: number;
}

export interface VisualFingerprintProvider {
  readonly method: string;
  computeFromImageUrl(
    id: string,
    imageUrl: string,
    cropBox?: NormalizedBox | null,
  ): Promise<VisualFingerprint | null>;
}

export const DEFAULT_VISUAL_MAX_HAMMING = 10;
export const DEFAULT_VISUAL_MIN_HIST_SIM = 0.82;

const DHASH_WIDTH = 9;
const DHASH_HEIGHT = 8;
const HIST_LEVELS = 4; // 4 x 4 x 4 = 64 bins
const HIST_BINS = HIST_LEVELS * HIST_LEVELS * HIST_LEVELS;

/**
 * Thu nhỏ ảnh RGBA bất kỳ về kích thước 9x8 xám bằng lấy mẫu diện tích (area averaging)
 * và tính 64-bit Difference Hash (dHash) dạng chuỗi hex 16 ký tự.
 */
export function computeDHashFromRgba(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): string {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) {
    return "0000000000000000";
  }

  const gray = new Float32Array(DHASH_WIDTH * DHASH_HEIGHT);

  for (let gy = 0; gy < DHASH_HEIGHT; gy++) {
    const yStart = Math.floor((gy * height) / DHASH_HEIGHT);
    const yEnd = Math.max(yStart + 1, Math.floor(((gy + 1) * height) / DHASH_HEIGHT));

    for (let gx = 0; gx < DHASH_WIDTH; gx++) {
      const xStart = Math.floor((gx * width) / DHASH_WIDTH);
      const xEnd = Math.max(xStart + 1, Math.floor(((gx + 1) * width) / DHASH_WIDTH));

      let sum = 0;
      let count = 0;
      for (let y = yStart; y < yEnd; y++) {
        const rowOffset = y * width * 4;
        for (let x = xStart; x < xEnd; x++) {
          const idx = rowOffset + x * 4;
          // BT.601 luminance
          sum += 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
          count += 1;
        }
      }
      gray[gy * DHASH_WIDTH + gx] = count > 0 ? sum / count : 0;
    }
  }

  // So sánh từng cặp pixel kề ngang (8 cột x 8 hàng = 64 bit)
  let hex = "";
  let nibble = 0;
  let bitCount = 0;

  for (let y = 0; y < DHASH_HEIGHT; y++) {
    const row = y * DHASH_WIDTH;
    for (let x = 0; x < DHASH_WIDTH - 1; x++) {
      const bit = gray[row + x] > gray[row + x + 1] ? 1 : 0;
      nibble = (nibble << 1) | bit;
      bitCount += 1;
      if (bitCount === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bitCount = 0;
      }
    }
  }

  return hex.padEnd(16, "0");
}

/**
 * Tính biểu đồ màu RGB kết hợp (4x4x4 = 64 bins) chuẩn hóa L2.
 * Giúp phân biệt 2 người mặc màu áo/mũ khác nhau dù đứng cùng một khung hình nền.
 */
export function computeColorHistogramFromRgba(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): number[] {
  const bins = new Float64Array(HIST_BINS);
  const totalPixels = Math.min(width * height, Math.floor(rgba.length / 4));
  if (totalPixels <= 0) {
    return Array.from(bins);
  }

  // Bước nhảy nhẹ nếu ảnh lớn để giữ tốc độ < 2ms
  const stride = totalPixels > 16_384 ? Math.floor(totalPixels / 16_384) : 1;

  for (let p = 0; p < totalPixels; p += stride) {
    const idx = p * 4;
    const rBin = rgba[idx] >> 6; // 0..3
    const gBin = rgba[idx + 1] >> 6; // 0..3
    const bBin = rgba[idx + 2] >> 6; // 0..3
    bins[(rBin << 4) | (gBin << 2) | bBin] += 1;
  }

  let normSq = 0;
  for (let i = 0; i < HIST_BINS; i++) {
    normSq += bins[i] * bins[i];
  }
  const norm = Math.sqrt(normSq);
  if (norm <= 0) {
    return Array.from(bins);
  }

  const normalized = new Array<number>(HIST_BINS);
  for (let i = 0; i < HIST_BINS; i++) {
    normalized[i] = Number((bins[i] / norm).toFixed(5));
  }
  return normalized;
}

const POPCOUNT_NIBBLE = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

/**
 * Tính khoảng cách Hamming giữa 2 chuỗi hex 64-bit (trả về 0..64).
 */
export function hammingDistanceHex64(a: string, b: string): number {
  if (!a || !b || a.length !== 16 || b.length !== 16) return 64;
  let dist = 0;
  for (let i = 0; i < 16; i++) {
    const na = Number.parseInt(a[i], 16);
    const nb = Number.parseInt(b[i], 16);
    if (!Number.isFinite(na) || !Number.isFinite(nb)) return 64;
    dist += POPCOUNT_NIBBLE[na ^ nb];
  }
  return dist;
}

/**
 * Độ tương đồng Cosine giữa 2 vector số (0..1 với histogram không âm).
 */
export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA * normB);
  if (denom <= 0) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

/**
 * So sánh 2 VisualFingerprint để xác định 2 ảnh có thuộc cùng một cảnh/người vi phạm hay không.
 */
export function compareVisualFingerprints(
  a: VisualFingerprint,
  b: VisualFingerprint,
  thresholds?: VisualSimilarityThresholds,
): VisualSimilarityResult {
  const maxHamming = thresholds?.maxHamming ?? DEFAULT_VISUAL_MAX_HAMMING;
  const minHistogramSim = thresholds?.minHistogramSim ?? DEFAULT_VISUAL_MIN_HIST_SIM;

  const hammingDistance = hammingDistanceHex64(a.dHash, b.dHash);
  const dHashSimilarity = Math.max(0, (64 - hammingDistance) / 64);
  const histogramSimilarity = cosineSimilarity(a.histogram, b.histogram);
  const combinedScore = 0.55 * dHashSimilarity + 0.45 * histogramSimilarity;
  const isMatch =
    hammingDistance <= maxHamming && histogramSimilarity >= minHistogramSim;

  return {
    hammingDistance,
    dHashSimilarity,
    histogramSimilarity,
    combinedScore,
    isMatch,
  };
}

/**
 * Tạo URL proxy nội bộ same-origin trong Next.js để tránh lỗi CORS Tainted Canvas
 * khi đọc pixel từ MinIO hoặc API Gateway.
 */
export function buildThumbnailProxyUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/api/evidences/thumbnail")) {
    return trimmed;
  }
  return `/api/evidences/thumbnail?url=${encodeURIComponent(trimmed)}`;
}

/**
 * Trích xuất vùng pixel (có crop theo personBox nếu có) từ Blob ảnh trên trình duyệt
 * bằng OffscreenCanvas hoặc HTMLCanvasElement fallback.
 */
export async function computeFingerprintFromBlob(
  blob: Blob,
  id: string,
  cropBox?: NormalizedBox | null,
): Promise<VisualFingerprint | null> {
  const TARGET_W = 72;
  const TARGET_H = 64;

  if (typeof createImageBitmap === "function" && typeof OffscreenCanvas !== "undefined") {
    const bitmap = await createImageBitmap(blob);
    try {
      const sx = cropBox ? Math.max(0, Math.floor(cropBox.x * bitmap.width)) : 0;
      const sy = cropBox ? Math.max(0, Math.floor(cropBox.y * bitmap.height)) : 0;
      const sw = cropBox
        ? Math.max(8, Math.min(bitmap.width - sx, Math.ceil(cropBox.width * bitmap.width)))
        : bitmap.width;
      const sh = cropBox
        ? Math.max(8, Math.min(bitmap.height - sy, Math.ceil(cropBox.height * bitmap.height)))
        : bitmap.height;

      const canvas = new OffscreenCanvas(TARGET_W, TARGET_H);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
      const imageData = ctx.getImageData(0, 0, TARGET_W, TARGET_H);
      return {
        id,
        dHash: computeDHashFromRgba(imageData.data, TARGET_W, TARGET_H),
        histogram: computeColorHistogramFromRgba(imageData.data, TARGET_W, TARGET_H),
        computedAt: Date.now(),
        method: "dhash-hist-v1",
      };
    } finally {
      bitmap.close();
    }
  }

  if (typeof document === "undefined" || typeof URL === "undefined") {
    return null;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image decode failed"));
      el.src = objectUrl;
    });

    const sx = cropBox ? Math.max(0, Math.floor(cropBox.x * img.naturalWidth)) : 0;
    const sy = cropBox ? Math.max(0, Math.floor(cropBox.y * img.naturalHeight)) : 0;
    const sw = cropBox
      ? Math.max(8, Math.min(img.naturalWidth - sx, Math.ceil(cropBox.width * img.naturalWidth)))
      : img.naturalWidth;
    const sh = cropBox
      ? Math.max(8, Math.min(img.naturalHeight - sy, Math.ceil(cropBox.height * img.naturalHeight)))
      : img.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
    const imageData = ctx.getImageData(0, 0, TARGET_W, TARGET_H);
    return {
      id,
      dHash: computeDHashFromRgba(imageData.data, TARGET_W, TARGET_H),
      histogram: computeColorHistogramFromRgba(imageData.data, TARGET_W, TARGET_H),
      computedAt: Date.now(),
      method: "dhash-hist-v1",
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// ============================================================================
// IndexedDB Persistent Cache (giảm lặp lại tính toán ảnh qua các lần reload)
// ============================================================================

const IDB_NAME = "ppe-visual-fingerprints-v1";
const IDB_STORE = "fingerprints";
const MAX_CACHE_ENTRIES = 2000;

const memoryCache = new Map<string, VisualFingerprint>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openFingerprintDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          const store = db.createObjectStore(IDB_STORE, { keyPath: "id" });
          store.createIndex("computedAt", "computedAt");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function getManyCachedFingerprints(
  ids: readonly string[],
): Promise<Map<string, VisualFingerprint>> {
  const result = new Map<string, VisualFingerprint>();
  const missing: string[] = [];

  for (const id of ids) {
    const hit = memoryCache.get(id);
    if (hit) {
      result.set(id, hit);
    } else {
      missing.push(id);
    }
  }

  if (missing.length === 0) return result;

  const db = await openFingerprintDb();
  if (!db) return result;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      for (const id of missing) {
        const req = store.get(id);
        req.onsuccess = () => {
          const val = req.result as VisualFingerprint | undefined;
          if (val && val.method === "dhash-hist-v1") {
            memoryCache.set(id, val);
            result.set(id, val);
          }
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });

  return result;
}

export async function saveCachedFingerprint(
  fp: VisualFingerprint,
): Promise<void> {
  memoryCache.set(fp.id, fp);
  if (memoryCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  const db = await openFingerprintDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put(fp);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
