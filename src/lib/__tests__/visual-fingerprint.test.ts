import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildThumbnailProxyUrl,
  compareVisualFingerprints,
  computeColorHistogramFromRgba,
  computeDHashFromRgba,
  cosineSimilarity,
  hammingDistanceHex64,
  type VisualFingerprint,
} from "../visual-fingerprint";

function makeSyntheticImage(
  width: number,
  height: number,
  pixelFn: (x: number, y: number) => [number, number, number],
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      const idx = (y * width + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

describe("visual-fingerprint (dHash + Color Histogram)", () => {
  it("matches identical and slightly shifted snapshots of the same person", () => {
    const imgA = makeSyntheticImage(72, 64, (x, y) => {
      // Nền xám công trường + người mặc áo xanh ở giữa
      const inPerson = x >= 24 && x <= 48 && y >= 10 && y <= 58;
      if (inPerson) return [30 + (x % 15), 90 + (y % 20), 210];
      return [120 + Math.floor(x * 1.2), 125 + Math.floor(y * 0.8), 130];
    });
    const imgShifted = makeSyntheticImage(72, 64, (x, y) => {
      // Cùng người dịch ngang 2px
      const inPerson = x >= 26 && x <= 50 && y >= 10 && y <= 58;
      if (inPerson) return [32 + (x % 15), 92 + (y % 20), 208];
      return [120 + Math.floor(x * 1.2), 125 + Math.floor(y * 0.8), 130];
    });

    const fpA: VisualFingerprint = {
      id: "a",
      dHash: computeDHashFromRgba(imgA, 72, 64),
      histogram: computeColorHistogramFromRgba(imgA, 72, 64),
      computedAt: Date.now(),
      method: "dhash-hist-v1",
    };
    const fpShifted: VisualFingerprint = {
      id: "b",
      dHash: computeDHashFromRgba(imgShifted, 72, 64),
      histogram: computeColorHistogramFromRgba(imgShifted, 72, 64),
      computedAt: Date.now(),
      method: "dhash-hist-v1",
    };

    const cmp = compareVisualFingerprints(fpA, fpShifted);
    assert.equal(fpA.dHash.length, 16);
    assert.equal(fpA.histogram.length, 64);
    assert.equal(cmp.isMatch, true);
    assert.ok(cmp.hammingDistance <= 10);
    assert.ok(cmp.histogramSimilarity >= 0.9);
  });

  it("rejects two people wearing completely different shirt colors in a similar layout", () => {
    const personBlue = makeSyntheticImage(72, 64, (x, y) => {
      if (x >= 10 && x <= 62 && y >= 8 && y <= 58) return [20, 40, 230];
      return [200, 200, 200];
    });
    const personOrange = makeSyntheticImage(72, 64, (x, y) => {
      if (x >= 10 && x <= 62 && y >= 8 && y <= 58) return [245, 110, 15];
      return [200, 200, 200];
    });

    const fpBlue: VisualFingerprint = {
      id: "blue",
      dHash: computeDHashFromRgba(personBlue, 72, 64),
      histogram: computeColorHistogramFromRgba(personBlue, 72, 64),
      computedAt: Date.now(),
      method: "dhash-hist-v1",
    };
    const fpOrange: VisualFingerprint = {
      id: "orange",
      dHash: computeDHashFromRgba(personOrange, 72, 64),
      histogram: computeColorHistogramFromRgba(personOrange, 72, 64),
      computedAt: Date.now(),
      method: "dhash-hist-v1",
    };

    const cmp = compareVisualFingerprints(fpBlue, fpOrange);
    assert.equal(cmp.isMatch, false);
    assert.ok(cmp.histogramSimilarity < 0.5);
  });

  it("computes hamming distance, cosine similarity and proxy URLs safely", () => {
    assert.equal(hammingDistanceHex64("ffffffffffffffff", "ffffffffffffffff"), 0);
    assert.equal(hammingDistanceHex64("ffffffffffffffff", "0000000000000000"), 64);
    assert.equal(hammingDistanceHex64("000000000000000f", "0000000000000000"), 4);
    assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
    assert.equal(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0);
    assert.equal(
      buildThumbnailProxyUrl("http://localhost:9000/ppe-evidences/a.jpg"),
      "/api/evidences/thumbnail?url=http%3A%2F%2Flocalhost%3A9000%2Fppe-evidences%2Fa.jpg",
    );
  });
});
