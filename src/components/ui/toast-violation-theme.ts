export type IncidentToastKind =
  | "RAW_AI_ALERT"
  | "MANAGER_DISPATCH"
  | "OFFICER_RESOLVED_REPORT"
  | "INCIDENT_COMMENT";

export type IncidentToastSeverity =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "NORMAL"
  | "LOW";

export type ViolationToastIconKey =
  | "shield-ban"
  | "hard-hat"
  | "shirt"
  | "layers"
  | "alert-triangle"
  | "shield-alert"
  | "send"
  | "check-circle"
  | "message-square";

export interface ViolationVisualToken {
  code: string;
  labelVi: string;
  labelEn: string;
  accentLight: string;
  accentDark: string;
  shadowLight: string;
  shadowDark: string;
  pillBgLight: string;
  pillBgDark: string;
  iconKey: ViolationToastIconKey;
}

export interface ResolvedIncidentToastVisual {
  primary: ViolationVisualToken;
  /** Nhãn màu vi phạm phụ khi toast là luồng điều phối / nghiệm thu nhưng có mã vi phạm cụ thể */
  violationBadge: ViolationVisualToken | null;
  severity: IncidentToastSeverity;
  isCritical: boolean;
  durationMs: number;
}

const RESTRICTED_ZONE_TOKEN: ViolationVisualToken = {
  code: "RESTRICTED_AREA",
  labelVi: "Xâm nhập vùng cấm",
  labelEn: "Restricted Zone",
  accentLight: "#dc2626",
  accentDark: "#fb7185",
  shadowLight: "rgba(220, 38, 38, 0.24)",
  shadowDark: "rgba(251, 113, 133, 0.28)",
  pillBgLight: "rgba(220, 38, 38, 0.11)",
  pillBgDark: "rgba(251, 113, 133, 0.16)",
  iconKey: "shield-ban",
};

const MULTI_VIOLATION_TOKEN: ViolationVisualToken = {
  code: "MULTI_VIOLATION",
  labelVi: "Đa vi phạm PPE",
  labelEn: "Multi-Violation",
  accentLight: "#be123c",
  accentDark: "#f43f5e",
  shadowLight: "rgba(190, 18, 60, 0.25)",
  shadowDark: "rgba(244, 63, 94, 0.28)",
  pillBgLight: "rgba(190, 18, 60, 0.11)",
  pillBgDark: "rgba(244, 63, 94, 0.16)",
  iconKey: "layers",
};

const NO_HELMET_TOKEN: ViolationVisualToken = {
  code: "NO_HELMET",
  labelVi: "Không đội mũ bảo hộ",
  labelEn: "No Hard Hat",
  accentLight: "#c2410c",
  accentDark: "#fb923c",
  shadowLight: "rgba(194, 65, 12, 0.24)",
  shadowDark: "rgba(251, 146, 60, 0.26)",
  pillBgLight: "rgba(194, 65, 12, 0.11)",
  pillBgDark: "rgba(251, 146, 60, 0.16)",
  iconKey: "hard-hat",
};

const NO_VEST_TOKEN: ViolationVisualToken = {
  code: "NO_VEST",
  labelVi: "Không mặc áo phản quang",
  labelEn: "No Safety Vest",
  accentLight: "#a16207",
  accentDark: "#fbbf24",
  shadowLight: "rgba(161, 98, 7, 0.22)",
  shadowDark: "rgba(251, 191, 36, 0.25)",
  pillBgLight: "rgba(161, 98, 7, 0.11)",
  pillBgDark: "rgba(251, 191, 36, 0.16)",
  iconKey: "shirt",
};

const AUXILIARY_PPE_BASE = {
  accentLight: "#6d28d9",
  accentDark: "#a78bfa",
  shadowLight: "rgba(109, 40, 217, 0.22)",
  shadowDark: "rgba(167, 139, 250, 0.26)",
  pillBgLight: "rgba(109, 40, 217, 0.10)",
  pillBgDark: "rgba(167, 139, 250, 0.16)",
  iconKey: "alert-triangle" as const,
};

const FALLBACK_PPE_TOKEN: ViolationVisualToken = {
  code: "PPE_VIOLATION",
  labelVi: "Vi phạm bảo hộ PPE",
  labelEn: "PPE Violation",
  accentLight: "#c45e52",
  accentDark: "#f87171",
  shadowLight: "rgba(196, 94, 82, 0.24)",
  shadowDark: "rgba(248, 113, 113, 0.26)",
  pillBgLight: "rgba(196, 94, 82, 0.11)",
  pillBgDark: "rgba(248, 113, 113, 0.16)",
  iconKey: "shield-alert",
};

export const VIOLATION_TOAST_THEMES: Record<string, ViolationVisualToken> = {
  RESTRICTED_AREA: RESTRICTED_ZONE_TOKEN,
  RESTRICTED_ZONE: RESTRICTED_ZONE_TOKEN,
  MULTI_VIOLATION: MULTI_VIOLATION_TOKEN,
  NO_HELMET: NO_HELMET_TOKEN,
  NO_HARDHAT: NO_HELMET_TOKEN,
  NO_VEST: NO_VEST_TOKEN,
  NO_BOOTS: {
    code: "NO_BOOTS",
    labelVi: "Không mang giày bảo hộ",
    labelEn: "No Safety Boots",
    ...AUXILIARY_PPE_BASE,
  },
  NO_GLOVES: {
    code: "NO_GLOVES",
    labelVi: "Không đeo găng tay bảo hộ",
    labelEn: "No Safety Gloves",
    ...AUXILIARY_PPE_BASE,
  },
  NO_MASK: {
    code: "NO_MASK",
    labelVi: "Không đeo khẩu trang",
    labelEn: "No Mask",
    ...AUXILIARY_PPE_BASE,
  },
};

export const INCIDENT_KIND_THEMES: Record<
  Exclude<IncidentToastKind, "RAW_AI_ALERT">,
  ViolationVisualToken
> = {
  MANAGER_DISPATCH: {
    code: "MANAGER_DISPATCH",
    labelVi: "Điều phối xử lý",
    labelEn: "Manager Dispatch",
    accentLight: "#0369a1",
    accentDark: "#38bdf8",
    shadowLight: "rgba(3, 105, 161, 0.22)",
    shadowDark: "rgba(56, 189, 248, 0.26)",
    pillBgLight: "rgba(3, 105, 161, 0.10)",
    pillBgDark: "rgba(56, 189, 248, 0.16)",
    iconKey: "send",
  },
  OFFICER_RESOLVED_REPORT: {
    code: "OFFICER_RESOLVED_REPORT",
    labelVi: "Đã khắc phục",
    labelEn: "Resolved Report",
    accentLight: "#4d7c3f",
    accentDark: "#6ee7b7",
    shadowLight: "rgba(77, 124, 63, 0.24)",
    shadowDark: "rgba(110, 231, 183, 0.24)",
    pillBgLight: "rgba(77, 124, 63, 0.11)",
    pillBgDark: "rgba(110, 231, 183, 0.15)",
    iconKey: "check-circle",
  },
  INCIDENT_COMMENT: {
    code: "INCIDENT_COMMENT",
    labelVi: "Bình luận hiện trường",
    labelEn: "Field Comment",
    accentLight: "#4f46e5",
    accentDark: "#818cf8",
    shadowLight: "rgba(79, 70, 229, 0.22)",
    shadowDark: "rgba(129, 140, 248, 0.26)",
    pillBgLight: "rgba(79, 70, 229, 0.10)",
    pillBgDark: "rgba(129, 140, 248, 0.16)",
    iconKey: "message-square",
  },
};

export function normalizeIncidentSeverity(
  severity?: string | null,
): IncidentToastSeverity {
  const upper = (severity || "").toUpperCase().trim();
  if (
    upper === "CRITICAL" ||
    upper === "HIGH" ||
    upper === "MEDIUM" ||
    upper === "NORMAL" ||
    upper === "LOW"
  ) {
    return upper;
  }
  return "HIGH";
}

export function getIncidentToastDuration(
  severity: IncidentToastSeverity,
  kind: IncidentToastKind = "RAW_AI_ALERT",
): number {
  if (kind === "OFFICER_RESOLVED_REPORT" || kind === "INCIDENT_COMMENT") return 5000;
  if (severity === "CRITICAL") return 8000;
  if (severity === "HIGH") return 7000;
  return 5500;
}

export function resolveIncidentToastVisual(params: {
  kind?: IncidentToastKind;
  violationType?: string | null;
  severity?: string | null;
}): ResolvedIncidentToastVisual {
  const kind: IncidentToastKind = params.kind ?? "RAW_AI_ALERT";
  const severity = normalizeIncidentSeverity(params.severity);
  const violationKey = params.violationType?.toUpperCase().trim() || "";
  const matchedViolation = violationKey
    ? VIOLATION_TOAST_THEMES[violationKey] ?? null
    : null;

  if (kind === "MANAGER_DISPATCH") {
    return {
      primary: INCIDENT_KIND_THEMES.MANAGER_DISPATCH,
      violationBadge: matchedViolation,
      severity,
      isCritical: severity === "CRITICAL",
      durationMs: getIncidentToastDuration(severity, kind),
    };
  }

  if (kind === "OFFICER_RESOLVED_REPORT") {
    return {
      primary: INCIDENT_KIND_THEMES.OFFICER_RESOLVED_REPORT,
      violationBadge: matchedViolation,
      severity,
      isCritical: false,
      durationMs: getIncidentToastDuration(severity, kind),
    };
  }

  if (kind === "INCIDENT_COMMENT") {
    return {
      primary: INCIDENT_KIND_THEMES.INCIDENT_COMMENT,
      violationBadge: matchedViolation,
      severity,
      isCritical: false,
      durationMs: getIncidentToastDuration(severity, kind),
    };
  }

  return {
    primary: matchedViolation ?? FALLBACK_PPE_TOKEN,
    violationBadge: null,
    severity,
    isCritical: severity === "CRITICAL",
    durationMs: getIncidentToastDuration(severity, kind),
  };
}
