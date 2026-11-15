/**
 * Shared Soft-Neumorphism surface & tactile control classes (strictly paired with
 * `primary` and `accent` tokens). Shared across `/ai-metrics/test`, `/cameras`,
 * and `/cameras/[id]`.
 */
export const NM = {
  chassis:
    "bg-background " +
    "shadow-[14px_14px_28px_rgba(0,0,0,0.12),-14px_-14px_28px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] " +
    "dark:shadow-[14px_14px_28px_rgba(0,0,0,0.55),-10px_-10px_24px_rgba(255,255,255,0.04),inset_1px_1px_1px_rgba(255,255,255,0.07)] " +
    "border border-white/40 dark:border-white/[0.06]",

  extruded:
    "bg-background " +
    "shadow-[6px_6px_12px_rgba(0,0,0,0.09),-6px_-6px_12px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] " +
    "dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03),inset_1px_1px_1px_rgba(255,255,255,0.06)] " +
    "border border-white/40 dark:border-white/[0.05]",

  recessed:
    "bg-background/80 " +
    "shadow-[inset_5px_5px_10px_rgba(0,0,0,0.11),inset_-5px_-5px_10px_rgba(255,255,255,0.7)] " +
    "dark:shadow-[inset_5px_5px_10px_rgba(0,0,0,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.03)] " +
    "border border-black/[0.04] dark:border-white/[0.03]",

  tactileBtn:
    "bg-background " +
    "shadow-[5px_5px_10px_rgba(0,0,0,0.1),-5px_-5px_10px_rgba(255,255,255,0.8),inset_1px_1px_1px_rgba(255,255,255,0.6)] " +
    "dark:shadow-[5px_5px_10px_rgba(0,0,0,0.5),-4px_-4px_8px_rgba(255,255,255,0.04)] " +
    "hover:shadow-[8px_8px_16px_rgba(0,0,0,0.13),-8px_-8px_16px_rgba(255,255,255,0.85)] " +
    "active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] " +
    "dark:active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.03)] " +
    "border border-white/50 dark:border-white/[0.06] transition-all duration-200 cursor-pointer",
} as const;

