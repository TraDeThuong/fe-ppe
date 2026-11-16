import DOMPurify, { type Config } from "dompurify";

type SanitizerWindow = Parameters<typeof DOMPurify>[0];

const EMAIL_SANITIZE_CONFIG: Config = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ["target"],
  FORBID_TAGS: [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "textarea",
    "select",
    "button",
    "base",
    "meta",
    "link",
    "style",
  ],
  FORBID_ATTR: ["srcdoc", "formaction"],
  ALLOW_DATA_ATTR: false,
};

/**
 * Khử độc HTML email trước khi render bằng `dangerouslySetInnerHTML`.
 * Luôn trả về chuỗi rỗng trên môi trường SSR (khi chưa có DOM `window`)
 * để đảm bảo không bao giờ render HTML thô chưa kiểm soát.
 */
export function sanitizeHtml(
  dirtyHtml: string | null | undefined,
  targetWindow?: SanitizerWindow,
): string {
  if (!dirtyHtml) return "";

  const win = targetWindow ?? (typeof window !== "undefined" ? window : undefined);
  if (!win) return "";

  const purifier = !targetWindow && DOMPurify.isSupported ? DOMPurify : DOMPurify(win as unknown as SanitizerWindow);
  if (!purifier.isSupported) return "";

  purifier.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });

  try {
    return purifier.sanitize(dirtyHtml, EMAIL_SANITIZE_CONFIG);
  } finally {
    purifier.removeHook("afterSanitizeAttributes");
  }
}

