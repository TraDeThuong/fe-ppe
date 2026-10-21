"use client";

import { Check } from "lucide-react";

import { useLocale } from "@/providers/locale-provider";

export interface PasswordChecklistProps {
  /** Key i18n cho dòng tiêu đề, ví dụ "register.checklistTitle" */
  titleKey: string;
  /** Tiền tố key i18n cho 5 nhãn tiêu chí (register|resetPassword|changePassword).checklist.* */
  labelPrefix: "register.checklist" | "resetPassword.checklist" | "changePassword.checklist";
  password: string;
}

/**
 * Checklist 5 tiêu chí password policy — khớp register/reset/changePasswordSchema
 * phía BE (auth.validation.ts). Cập nhật realtime theo từng ký tự gõ.
 */
export function PasswordChecklist({ titleKey, labelPrefix, password }: PasswordChecklistProps) {
  const { t } = useLocale();

  const checks = [
    { id: "length", pass: password.length >= 8, labelKey: `${labelPrefix}.length` },
    { id: "lowercase", pass: /[a-z]/.test(password), labelKey: `${labelPrefix}.lowercase` },
    { id: "uppercase", pass: /[A-Z]/.test(password), labelKey: `${labelPrefix}.uppercase` },
    { id: "number", pass: /[0-9]/.test(password), labelKey: `${labelPrefix}.number` },
    { id: "special", pass: /[^a-zA-Z0-9]/.test(password), labelKey: `${labelPrefix}.special` },
  ];

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{t(titleKey)}</p>
      <ul className="mt-2 space-y-1.5">
        {checks.map((check) => (
          <li
            key={check.id}
            data-satisfied={check.pass}
            className={[
              "flex items-center gap-2 text-xs transition-colors",
              check.pass ? "text-success" : "text-muted-foreground",
            ].join(" ")}
          >
            <Check
              className={["size-3.5", check.pass ? "text-success" : "opacity-30"].join(" ")}
              aria-hidden="true"
            />
            {t(check.labelKey)}
          </li>
        ))}
      </ul>
    </div>
  );
}
