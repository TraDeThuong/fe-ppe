/**
 * Centralized unique entity code generator & collision checker for Smart PPE Frontend.
 *
 * Ensures generated codes strictly comply with each Backend microservice's Zod regex
 * and length constraints (2..50 chars) while avoiding collisions with existing entities.
 */

const READABLE_ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type CodeSeparator = "-" | "_";

export interface GenerateUniqueCodeOptions {
  /** Entity prefix, e.g. "SITE", "CAM", "ZONE", "RPT", "MDL", "TPL" */
  prefix: string;
  /** Optional entity name typed by the user to derive a readable slug */
  nameHint?: string;
  /** Optional secondary hint (e.g., fileType "PDF" or channel "IN_APP") */
  extraHint?: string;
  /** Iterable of existing codes in the catalog/list for collision avoidance */
  existingCodes?: Iterable<string>;
  /** Allowed word separator ("-" by default; "_" for Notification Templates) */
  separator?: CodeSeparator;
  /** Format result in lowercase (e.g. for report templates or AI models if preferred) */
  lowercase?: boolean;
  /** Maximum length allowed by BE (default: 50) */
  maxLength?: number;
  /** Random suffix length (default: 4) */
  randomLength?: number;
  /** Always append a random suffix even if the base slug is not in existingCodes (prevents soft-delete DB collisions) */
  alwaysIncludeRandomSuffix?: boolean;
}

/**
 * Converts a Vietnamese or Unicode string into an ASCII alphanumeric slug
 * joined by the specified separator (`-` or `_`).
 */
export function toAsciiSlug(
  input: string,
  separator: CodeSeparator = "-",
): string {
  if (!input) return "";
  const escapedSep = separator === "_" ? "_" : "\\-";
  const nonAlnumRegex = new RegExp(`[^A-Z0-9]+`, "g");
  const trimSepRegex = new RegExp(`^${escapedSep}+|${escapedSep}+$`, "g");

  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(nonAlnumRegex, separator)
    .replace(trimSepRegex, "");
}

/**
 * Generates a readable random alphanumeric token (excluding ambiguous chars 0, O, 1, I).
 */
export function generateRandomToken(length = 4): string {
  const safeLen = Math.max(2, Math.min(16, Math.floor(length)));
  let token = "";
  for (let i = 0; i < safeLen; i++) {
    const idx = Math.floor(Math.random() * READABLE_ALPHANUMERIC.length);
    token += READABLE_ALPHANUMERIC[idx];
  }
  return token;
}

/**
 * Normalizes an iterable of existing codes into a fast case-insensitive lookup Set.
 */
export function buildExistingCodeSet(
  existingCodes?: Iterable<string>,
): Set<string> {
  const set = new Set<string>();
  if (!existingCodes) return set;
  for (const code of existingCodes) {
    if (typeof code === "string" && code.trim()) {
      set.add(code.trim().toUpperCase());
    }
  }
  return set;
}

/**
 * Checks whether a candidate code already exists in `existingCodes` (case-insensitive).
 */
export function isCodeTaken(
  candidate: string,
  existingCodes?: Iterable<string>,
): boolean {
  const trimmed = candidate.trim();
  if (!trimmed || !existingCodes) return false;
  const set =
    existingCodes instanceof Set
      ? existingCodes
      : buildExistingCodeSet(existingCodes);
  const upper = trimmed.toUpperCase();
  if (set.has(upper)) return true;
  if (existingCodes instanceof Set) {
    for (const item of existingCodes) {
      if (typeof item === "string" && item.trim().toUpperCase() === upper) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Sanitizes a user-entered manual code so it conforms to the target BE regex.
 * - `"standard"`: `/^[A-Z0-9_-]+$/i` (Site, Camera, Zone)
 * - `"dotted"`: `/^[A-Za-z0-9_.-]+$/` (ReportTemplate, AiModel)
 * - `"underscore_upper"`: `/^[A-Z0-9_]+$/` (NotificationTemplate)
 */
export function sanitizeManualCode(
  raw: string,
  mode: "standard" | "dotted" | "underscore_upper" = "standard",
  maxLength = 50,
): string {
  const ascii = raw
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  if (!ascii) return "";

  if (mode === "underscore_upper") {
    return ascii
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, maxLength);
  }

  if (mode === "dotted") {
    return ascii
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, maxLength);
  }

  return ascii
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

const REDUNDANT_LEADING_TOKENS: Record<string, string[]> = {
  CAM: ["CAMERA", "CAM"],
  SITE: ["CONG-TRUONG", "CONG_TRUONG", "SITE"],
  ZONE: ["PHAN-KHU", "PHAN_KHU", "ZONE"],
  RPT: ["MAU-BAO-CAO", "BAO-CAO", "REPORT", "RPT"],
  MDL: ["MO-HINH", "MODEL", "MDL"],
  TPL: ["MAU_THONG_BAO", "THONG_BAO", "TEMPLATE", "TPL"],
};

/**
 * Generates a unique, human-friendly entity code guaranteed not to collide with `existingCodes`
 * and strictly within `2..maxLength` characters.
 */
export function generateUniqueEntityCode(
  options: GenerateUniqueCodeOptions,
): string {
  const {
    prefix,
    nameHint = "",
    extraHint = "",
    existingCodes,
    separator = "-",
    lowercase = false,
    maxLength = 50,
    randomLength = 4,
    alwaysIncludeRandomSuffix = true,
  } = options;

  const existingSet = buildExistingCodeSet(existingCodes);
  const cleanPrefix = toAsciiSlug(prefix, separator) || "CODE";
  const cleanExtra = toAsciiSlug(extraHint, separator);
  let cleanName = toAsciiSlug(nameHint, separator);

  // Strip duplicate leading prefix or redundant entity words from name slug
  const redundantList = REDUNDANT_LEADING_TOKENS[cleanPrefix] ?? [cleanPrefix];
  for (const token of redundantList) {
    const normalizedToken = token.replace(/[-_]/g, separator);
    if (cleanName === normalizedToken) {
      cleanName = "";
      break;
    }
    if (cleanName.startsWith(`${normalizedToken}${separator}`)) {
      cleanName = cleanName.slice(normalizedToken.length + 1);
      break;
    }
  }

  const baseParts = [cleanPrefix];
  if (cleanExtra) baseParts.push(cleanExtra);

  const prefixSegment = baseParts.join(separator);

  const formatCase = (val: string) =>
    lowercase ? val.toLowerCase() : val.toUpperCase();

  const buildCandidate = (suffix: string): string => {
    const reservedForPrefixAndSuffix =
      prefixSegment.length +
      (suffix ? separator.length + suffix.length : 0);
    const maxNameSlugLen = Math.max(
      0,
      Math.min(20, maxLength - reservedForPrefixAndSuffix - separator.length),
    );

    let truncatedName = cleanName ? cleanName.slice(0, maxNameSlugLen) : "";
    if (truncatedName.endsWith(separator)) {
      truncatedName = truncatedName.slice(0, -1);
    }

    const parts = [prefixSegment];
    if (truncatedName) parts.push(truncatedName);
    if (suffix) parts.push(suffix);

    let joined = parts.join(separator).slice(0, maxLength);
    if (joined.endsWith(separator)) {
      joined = joined.slice(0, -1);
    }
    if (joined.length < 2) {
      joined = `${cleanPrefix}${separator}${generateRandomToken(4)}`.slice(
        0,
        maxLength,
      );
    }
    return formatCase(joined);
  };

  // If caller prefers clean deterministic slug first when not taken
  if (!alwaysIncludeRandomSuffix && cleanName) {
    const deterministic = buildCandidate("");
    if (!existingSet.has(deterministic.toUpperCase())) {
      return deterministic;
    }
  }

  // Try random suffixes until guaranteed unique
  for (let attempt = 0; attempt < 50; attempt++) {
    const tokenLen = attempt < 25 ? randomLength : randomLength + 2;
    const suffix = generateRandomToken(tokenLen);
    const candidate = buildCandidate(suffix);
    if (!existingSet.has(candidate.toUpperCase())) {
      return candidate;
    }
  }

  // Fallback with timestamp + random
  const fallbackSuffix = `${Date.now().toString(36).toUpperCase().slice(-4)}${generateRandomToken(2)}`;
  return buildCandidate(fallbackSuffix);
}
