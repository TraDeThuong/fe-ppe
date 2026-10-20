
"use client";

import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";

export type NeumorphicLevel = "flat" | "raised" | "raised-strong" | "inset" | "inset-strong";

export interface NeumorphicSurfaceProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  children?: ReactNode;
  level?: NeumorphicLevel;
  defaultLevel?: NeumorphicLevel;
  onLevelChange?: (level: NeumorphicLevel) => void;

  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  backgroundColor?: string;
  radius?: CSSProperties["borderRadius"];
  clickable?: boolean;
  cycleLevels?: NeumorphicLevel[];
}

const levelClasses: Record<NeumorphicLevel, string> = {
  flat: "",
  raised:
    "shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)]",
  "raised-strong":
    "shadow-[10px_10px_20px_var(--shadow-dark),-10px_-10px_20px_var(--shadow-light)]",
  inset:
    "shadow-[inset_5px_5px_10px_var(--shadow-dark),inset_-5px_-5px_10px_var(--shadow-light)]",
  "inset-strong":
    "shadow-[inset_9px_9px_18px_var(--shadow-dark),inset_-9px_-9px_18px_var(--shadow-light)]",
};

const defaultCycle: NeumorphicLevel[] = [
  "flat",
  "raised",
  "raised-strong",
  "inset",
  "inset-strong",
];

export const NeumorphicSurface = forwardRef<
  HTMLDivElement,
  NeumorphicSurfaceProps
>(function NeumorphicSurface(
  {
    children,
    level,
    defaultLevel = "raised",
    onLevelChange,
    width = "100%",
    height = "160px",
    backgroundColor,
    radius = "20px",
    clickable = true,
    cycleLevels = defaultCycle,
    className = "",
    style,
    onClick,
    role,
    tabIndex,
    onKeyDown,
    ...props
  },
  ref,
) {
  const [internalLevel, setInternalLevel] =
    useState<NeumorphicLevel>(defaultLevel);

  const currentLevel = level ?? internalLevel;

  function changeLevel() {
    if (!clickable) return;

    const currentIndex = cycleLevels.indexOf(currentLevel);
    const nextLevel =
      cycleLevels[(currentIndex + 1) % cycleLevels.length] ?? "raised";

    if (level === undefined) {
      setInternalLevel(nextLevel);
    }

    onLevelChange?.(nextLevel);
  }

  const customStyle: CSSProperties = {
    width,
    height,
    borderRadius: radius,
    ...(backgroundColor
      ? {
          backgroundColor,
          // Keep the surface and its shadow variables visually coherent
          "--shadow-dark": "rgba(0, 0, 0, 0.18)",
          "--shadow-light": "rgba(255, 255, 255, 0.85)",
        }
      : {}),
    transition:
      "box-shadow 300ms ease, background-color 300ms ease, transform 300ms ease",
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      role={clickable ? role ?? "button" : role}
      tabIndex={clickable ? tabIndex ?? 0 : tabIndex}
      aria-pressed={clickable ? currentLevel.includes("raised") || currentLevel.includes("inset") : undefined}
      onClick={(event) => {
        onClick?.(event);
        changeLevel();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);

        if (
          clickable &&
          !event.defaultPrevented &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          changeLevel();
        }
      }}
      className={[
        "relative flex items-center justify-center",
        "bg-background text-foreground",
        "border border-border/30",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "select-none",
        clickable ? "cursor-pointer active:scale-[0.99]" : "",
        levelClasses[currentLevel],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={customStyle}
      {...props}
    >
      {children}
    </div>
  );
});

NeumorphicSurface.displayName = "NeumorphicSurface";
