"use client";

import * as React from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export interface UseAnimatedNumberOptions {
  duration?: number;
  delay?: number;
  enabled?: boolean;
}

/**
 * Animates a numeric value from 0 on mount (and smoothly between updates)
 * using requestAnimationFrame while keeping SSR output equal to the real target.
 * Resilient to React Strict Mode double-effect invocations.
 */
export function useAnimatedNumber(
  target: number,
  options: UseAnimatedNumberOptions = {},
): number {
  const { duration = 680, delay = 0, enabled = true } = options;
  const safeTarget = Number.isFinite(target) ? target : 0;

  const [display, setDisplay] = React.useState<number>(safeTarget);
  const completedTargetRef = React.useRef<number | null>(null);
  const currentRef = React.useRef<number>(safeTarget);

  useIsomorphicLayoutEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      currentRef.current = safeTarget;
      completedTargetRef.current = safeTarget;
      setDisplay(safeTarget);
      return;
    }

    if (completedTargetRef.current === safeTarget) {
      return;
    }

    const from =
      completedTargetRef.current === null ? 0 : currentRef.current;

    if (from === safeTarget) {
      currentRef.current = safeTarget;
      completedTargetRef.current = safeTarget;
      setDisplay(safeTarget);
      return;
    }

    currentRef.current = from;
    setDisplay(from);

    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const startAnimation = () => {
      const startTime = performance.now();

      const step = (now: number) => {
        if (cancelled) return;
        const elapsed = now - startTime;
        const progress = duration > 0 ? Math.min(1, elapsed / duration) : 1;
        const eased = easeOutQuart(progress);
        const nextValue = from + (safeTarget - from) * eased;

        currentRef.current = nextValue;
        setDisplay(nextValue);

        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          currentRef.current = safeTarget;
          completedTargetRef.current = safeTarget;
          setDisplay(safeTarget);
        }
      };

      rafId = requestAnimationFrame(step);
    };

    if (delay > 0) {
      timeoutId = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [safeTarget, duration, delay, enabled]);

  return display;
}

/**
 * Animates a percentage (0-100) from 0 on mount so CSS transitions on width/height/dashoffset
 * visually sweep in when entering a page. SSR outputs the exact target percent.
 */
export function useAnimatedProgress(
  targetPercent: number,
  options: { delay?: number; enabled?: boolean } = {},
): number {
  const { delay = 30, enabled = true } = options;
  const safeTarget = Number.isFinite(targetPercent)
    ? Math.max(0, Math.min(100, targetPercent))
    : 0;

  const [value, setValue] = React.useState<number>(safeTarget);
  const completedTargetRef = React.useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      completedTargetRef.current = safeTarget;
      setValue(safeTarget);
      return;
    }

    if (completedTargetRef.current === safeTarget) {
      return;
    }

    if (safeTarget === 0) {
      completedTargetRef.current = 0;
      setValue(0);
      return;
    }

    if (completedTargetRef.current !== null) {
      completedTargetRef.current = safeTarget;
      setValue(safeTarget);
      return;
    }

    setValue(0);
    let raf1 = 0;
    let raf2 = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const trigger = () => {
      raf1 = requestAnimationFrame(() => {
        if (cancelled) return;
        raf2 = requestAnimationFrame(() => {
          if (cancelled) return;
          completedTargetRef.current = safeTarget;
          setValue(safeTarget);
        });
      });
    };

    if (delay > 0) {
      timeoutId = setTimeout(trigger, delay);
    } else {
      trigger();
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [safeTarget, delay, enabled]);

  return value;
}

export interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  delay?: number;
  enabled?: boolean;
  format?: (val: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Renders a rapidly counting-up number on mount/update while staying SSR & hydration safe.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 680,
  delay = 0,
  enabled = true,
  format,
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const animated = useAnimatedNumber(value, { duration, delay, enabled });

  const rounded =
    decimals > 0
      ? Number(animated.toFixed(decimals))
      : Math.round(animated);

  const formatted = format
    ? format(rounded)
    : decimals > 0
      ? rounded.toFixed(decimals)
      : String(rounded);

  const text = `${prefix}${formatted}${suffix}`;

  if (className) {
    return <span className={`tabular-nums ${className}`}>{text}</span>;
  }

  return <>{text}</>;
}

interface ParsedToken {
  target: number;
  decimals: number;
  decimalSep: string;
  groupSep: string | null;
}

function parseNumericToken(raw: string): ParsedToken | null {
  // Grouped integer, e.g. 1,250 or 1.250 or 1,250,000
  const groupedMatch = raw.match(/^\d{1,3}(?:([.,])\d{3})+$/);
  if (groupedMatch) {
    const groupSep = groupedMatch[1];
    const target = Number(raw.replace(/[.,]/g, ""));
    if (!Number.isFinite(target)) return null;
    return { target, decimals: 0, decimalSep: ".", groupSep };
  }

  // Decimal number, e.g. 93.2 or 33,3 or 1.25
  const decimalMatch = raw.match(/^(\d+)([.,])(\d+)$/);
  if (decimalMatch) {
    const decimalSep = decimalMatch[2];
    const decimals = Math.min(4, decimalMatch[3].length);
    const target = Number(`${decimalMatch[1]}.${decimalMatch[3]}`);
    if (!Number.isFinite(target)) return null;
    return { target, decimals, decimalSep, groupSep: null };
  }

  // Plain integer
  if (/^\d+$/.test(raw)) {
    const target = Number(raw);
    if (!Number.isFinite(target)) return null;
    return { target, decimals: 0, decimalSep: ".", groupSep: null };
  }

  return null;
}

function formatGroupedInteger(n: number, sep: string): string {
  const rounded = Math.round(n);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

function formatTokenAtProgress(parsed: ParsedToken, progress: number): string {
  const current = parsed.target * progress;
  if (parsed.groupSep) {
    return formatGroupedInteger(current, parsed.groupSep);
  }
  if (parsed.decimals > 0) {
    const text = current.toFixed(parsed.decimals);
    return parsed.decimalSep === "," ? text.replace(".", ",") : text;
  }
  return String(Math.round(current));
}

function AnimatedMetricString({
  raw,
  duration,
  delay,
}: {
  raw: string;
  duration: number;
  delay: number;
}) {
  const [progress, setProgress] = React.useState<number>(1);
  const completedRawRef = React.useRef<string | null>(null);

  const tokens = React.useMemo(() => {
    const parts = raw.split(/(\d[\d.,]*)/g);
    return parts.map((part, idx) =>
      idx % 2 === 1 ? { part, parsed: parseNumericToken(part) } : { part, parsed: null },
    );
  }, [raw]);

  const hasAnimatableToken = tokens.some((t) => t.parsed !== null);

  useIsomorphicLayoutEffect(() => {
    if (!hasAnimatableToken || prefersReducedMotion()) {
      completedRawRef.current = raw;
      setProgress(1);
      return;
    }

    if (completedRawRef.current === raw) {
      return;
    }

    setProgress(0);

    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const startAnimation = () => {
      const startTime = performance.now();

      const step = (now: number) => {
        if (cancelled) return;
        const elapsed = now - startTime;
        const t = duration > 0 ? Math.min(1, elapsed / duration) : 1;
        setProgress(easeOutQuart(t));

        if (t < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          completedRawRef.current = raw;
          setProgress(1);
        }
      };

      rafId = requestAnimationFrame(step);
    };

    if (delay > 0) {
      timeoutId = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [raw, duration, delay, hasAnimatableToken]);

  if (!hasAnimatableToken || progress >= 1) {
    return <>{raw}</>;
  }

  const text = tokens
    .map((t) => (t.parsed ? formatTokenAtProgress(t.parsed, progress) : t.part))
    .join("");

  return <>{text}</>;
}

const NON_ANIMATABLE_PATTERN =
  /utc|gmt|^v\d|^\d{1,2}:\d{2}|^\s*[<>]=?|\d{4}-\d{2}-\d{2}|\d+\/\d+\/\d+/i;
const PLACEHOLDER_VALUES = new Set(["", "...", "—", "--", "--%", "N/A"]);

export interface AnimatedMetricValueProps {
  value: React.ReactNode;
  duration?: number;
  delay?: number;
}

/**
 * Automatically animates numeric values inside StatsCard & metric badges,
 * supporting numbers, formatted strings ("93.2%", "102/125", "14.2K", "1,250"),
 * and simple ReactElement wrappers (preserving data-testid and classes).
 */
export function AnimatedMetricValue({
  value,
  duration = 680,
  delay = 0,
}: AnimatedMetricValueProps) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return <>{value}</>;
    const decimals = Number.isInteger(value)
      ? 0
      : Math.min(2, (String(value).split(".")[1] ?? "").length);
    return (
      <AnimatedNumber
        value={value}
        decimals={decimals}
        duration={duration}
        delay={delay}
      />
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      PLACEHOLDER_VALUES.has(trimmed) ||
      NON_ANIMATABLE_PATTERN.test(trimmed) ||
      !/\d/.test(trimmed)
    ) {
      return <>{value}</>;
    }

    return <AnimatedMetricString raw={value} duration={duration} delay={delay} />;
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(value)) {
    const child = value.props?.children;
    if (
      typeof child === "string" ||
      typeof child === "number" ||
      (Array.isArray(child) &&
        child.every((c) => typeof c === "string" || typeof c === "number"))
    ) {
      const normalized = Array.isArray(child) ? child.join("") : child;
      return React.cloneElement(
        value,
        undefined,
        <AnimatedMetricValue value={normalized} duration={duration} delay={delay} />,
      );
    }
  }

  return <>{value}</>;
}
