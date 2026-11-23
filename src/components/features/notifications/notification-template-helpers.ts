import {
  PREDEFINED_SYSTEM_TEMPLATES,
  type PredefinedTemplateItem,
  type TemplateCategory,
} from "./notification-predefined-data";
import type { SoundPreset } from "@/services/sound.service";
import type { NotificationTemplateItemDto } from "@/types";

export type MergedNotificationTemplate = NotificationTemplateItemDto & {
  isSystem: boolean;
  /** True when the built-in template is rendered from frontend defaults and not yet saved to DB */
  isVirtualDefault: boolean;
  category: TemplateCategory;
  soundPreset: SoundPreset;
  placeholders?: PredefinedTemplateItem["placeholders"];
};

export interface TemplatePlaceholderOption {
  key: string;
  token: string;
  labelVi: string;
  labelEn: string;
  sample: string;
}

export const COMMON_TEMPLATE_PLACEHOLDERS: TemplatePlaceholderOption[] = [
  {
    key: "userName",
    token: "{{userName}}",
    labelVi: "Tên người nhận",
    labelEn: "Recipient name",
    sample: "Lê Hoàng Nam",
  },
  {
    key: "siteName",
    token: "{{siteName}}",
    labelVi: "Tên công trường",
    labelEn: "Site name",
    sample: "Công trường Landmark Tòa B",
  },
  {
    key: "zoneName",
    token: "{{zoneName}}",
    labelVi: "Khu vực / Tầng",
    labelEn: "Zone / Floor",
    sample: "Tầng 12 - Giàn giáo ngoài",
  },
  {
    key: "cameraCode",
    token: "{{cameraCode}}",
    labelVi: "Mã Camera",
    labelEn: "Camera code",
    sample: "CAM-NORTH-04",
  },
  {
    key: "violationType",
    token: "{{violationType}}",
    labelVi: "Loại vi phạm",
    labelEn: "Violation type",
    sample: "Thiếu nón bảo hộ (NO_HARDHAT)",
  },
  {
    key: "timestamp",
    token: "{{timestamp}}",
    labelVi: "Thời gian",
    labelEn: "Timestamp",
    sample: "14:32 28/10/2026",
  },
  {
    key: "actionUrl",
    token: "{{actionUrl}}",
    labelVi: "Liên kết xử lý",
    labelEn: "Action URL",
    sample: "http://localhost:3000/incidents",
  },
];

export const DEFAULT_SAMPLE_VARIABLES: Record<string, unknown> = {
  userName: "Lê Hoàng Nam",
  fullName: "Lê Hoàng Nam",
  workerName: "Nguyễn Văn An",
  workerId: "NV-8921",
  siteName: "Công trường Landmark Tòa B",
  zoneName: "Khu vực Giàn giáo Tầng 12",
  violationType: "Thiếu nón bảo hộ & dây an toàn",
  severity: "HIGH",
  cameraCode: "CAM-NORTH-04",
  cameraName: "Camera Cổng số 2",
  timestamp: "14:32 28/10/2026",
  actionUrl: "http://localhost:3000/incidents",
};

export const TEMPLATE_CATEGORY_STYLES: Record<
  TemplateCategory,
  { accentBarClass: string; pillClass: string }
> = {
  PPE: {
    accentBarClass: "bg-primary",
    pillClass: "border-primary/25 bg-primary/10 text-primary",
  },
  INFRASTRUCTURE: {
    accentBarClass: "bg-accent",
    pillClass: "border-accent/40 bg-accent/15 text-foreground",
  },
  SECURITY: {
    accentBarClass: "bg-foreground/60",
    pillClass: "border-foreground/15 bg-foreground/[0.06] text-foreground",
  },
  OPERATIONS: {
    accentBarClass: "bg-primary/55",
    pillClass: "border-border/50 bg-background/80 text-muted-foreground",
  },
};

export function resolveTemplateSoundPreset(
  code: string,
  predefined?: PredefinedTemplateItem,
): SoundPreset {
  if (predefined?.soundPreset) return predefined.soundPreset;
  const upper = code.toUpperCase();
  if (upper.includes("CRITICAL") || upper.includes("VIOLATION")) {
    return "critical";
  }
  if (upper.includes("WARNING") || upper.includes("ALERT")) {
    return "warning";
  }
  if (upper.includes("RESOLVED") || upper.includes("READY")) {
    return "success";
  }
  if (upper.includes("BROADCAST")) {
    return "radio";
  }
  return "info";
}

export function mergeNotificationTemplates(
  backendTemplates: NotificationTemplateItemDto[],
  isVietnamese: boolean,
): MergedNotificationTemplate[] {
  const list: MergedNotificationTemplate[] = [];
  const handledCodes = new Set<string>();

  // 1. Add templates persisted in backend first
  backendTemplates.forEach((bt) => {
    const predefined = PREDEFINED_SYSTEM_TEMPLATES.find(
      (p) => p.code === bt.code,
    );
    list.push({
      ...bt,
      isSystem: Boolean(predefined),
      isVirtualDefault: bt.id.startsWith("sys-"),
      category:
        predefined?.category ||
        (bt.code.toUpperCase().includes("PPE") ? "PPE" : "OPERATIONS"),
      soundPreset: resolveTemplateSoundPreset(bt.code, predefined),
      placeholders: predefined?.placeholders,
      description:
        bt.description ||
        (predefined
          ? isVietnamese
            ? predefined.description
            : predefined.descriptionEn
          : undefined),
    });
    handledCodes.add(bt.code);
  });

  // 2. Append built-in templates that are not yet saved in DB
  PREDEFINED_SYSTEM_TEMPLATES.forEach((pt) => {
    if (!handledCodes.has(pt.code)) {
      list.push({
        id: `sys-${pt.code}`,
        code: pt.code,
        name: isVietnamese ? pt.name : pt.nameEn,
        channel: pt.channel,
        subjectTemplate: pt.subjectTemplate,
        contentTemplate: pt.contentTemplate,
        status: "ACTIVE",
        description: isVietnamese ? pt.description : pt.descriptionEn,
        createdAt: "",
        updatedAt: "",
        isSystem: true,
        isVirtualDefault: true,
        category: pt.category,
        soundPreset: pt.soundPreset,
        placeholders: pt.placeholders,
      });
    }
  });

  return list;
}

export function extractTemplatePlaceholders(
  raw: string | null | undefined,
): string[] {
  if (!raw) return [];
  const found = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  return Array.from(found);
}

export function buildSampleVariables(
  template?: Pick<
    MergedNotificationTemplate,
    "placeholders" | "subjectTemplate" | "contentTemplate"
  > | null,
): Record<string, unknown> {
  const vars: Record<string, unknown> = { ...DEFAULT_SAMPLE_VARIABLES };

  if (template?.placeholders) {
    for (const ph of template.placeholders) {
      vars[ph.key] = ph.sample;
    }
  }

  const detectedKeys = [
    ...extractTemplatePlaceholders(template?.subjectTemplate),
    ...extractTemplatePlaceholders(template?.contentTemplate),
  ];

  for (const key of detectedKeys) {
    if (!(key in vars)) {
      vars[key] = `[${key}]`;
    }
  }

  return vars;
}

export function interpolateTemplate(
  raw: string | null | undefined,
  vars: Record<string, unknown>,
): string {
  if (!raw) return "";
  return raw.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (match, key: string) => {
      const val = vars[key];
      return val !== undefined && val !== null ? String(val) : match;
    },
  );
}

export function getPlaceholderChipsForTemplate(
  template?: Pick<MergedNotificationTemplate, "placeholders"> | null,
): TemplatePlaceholderOption[] {
  const seen = new Set<string>();
  const items: TemplatePlaceholderOption[] = [];

  if (template?.placeholders) {
    for (const ph of template.placeholders) {
      if (!seen.has(ph.key)) {
        seen.add(ph.key);
        items.push({
          key: ph.key,
          token: `{{${ph.key}}}`,
          labelVi: ph.label,
          labelEn: ph.labelEn,
          sample: ph.sample,
        });
      }
    }
  }

  for (const common of COMMON_TEMPLATE_PLACEHOLDERS) {
    if (!seen.has(common.key)) {
      seen.add(common.key);
      items.push(common);
    }
  }

  return items;
}
