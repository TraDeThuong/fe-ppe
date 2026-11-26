"use client";

import type { BoundingBox } from "@/types";
import { formatConfidencePct } from "./evidence-media-utils";

export interface AiBoundingBoxHudProps {
  box: BoundingBox;
  violationLabel: string;
  confidence?: number | null;
  compact?: boolean;
}

export function AiBoundingBoxHud({
  box,
  violationLabel,
  confidence,
  compact = false,
}: AiBoundingBoxHudProps) {
  const bx = box.x;
  const by = box.y;
  const bw = box.width;
  const bh = box.height;

  const cornerX = Math.min(bw * 0.25, 4.5);
  const cornerY = Math.min(bh * 0.25, 4.5);

  const isNearTop = by < 8;
  const badgeTop = isNearTop ? `calc(${by}% + 6px)` : `calc(${by}% - 32px)`;
  const badgeLeft = `${Math.max(1, Math.min(65, bx))}%`;
  const confidencePct = formatConfidencePct(box.confidence ?? confidence);

  return (
    <>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      >
        <defs>
          <filter id="incident-hud-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#f43f5e" floodOpacity="0.9" />
          </filter>
          <linearGradient id="incident-box-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <rect
          x={`${bx}%`}
          y={`${by}%`}
          width={`${bw}%`}
          height={`${bh}%`}
          fill="url(#incident-box-grad)"
          stroke="#f43f5e"
          strokeWidth="0.4"
          strokeOpacity="0.6"
          strokeDasharray="2 1.5"
          rx="0.6"
        />

        <g filter="url(#incident-hud-glow)">
          <path
            d={`M ${bx} ${by + cornerY} L ${bx} ${by} L ${bx + cornerX} ${by}`}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={`M ${bx + bw - cornerX} ${by} L ${bx + bw} ${by} L ${bx + bw} ${by + cornerY}`}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={`M ${bx} ${by + bh - cornerY} L ${bx} ${by + bh} L ${bx + cornerX} ${by + bh}`}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={`M ${bx + bw - cornerX} ${by + bh} L ${bx + bw} ${by + bh} L ${bx + bw} ${by + bh - cornerY}`}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <line
          x1={`${bx + 0.5}%`}
          y1={`${by + bh * 0.28}%`}
          x2={`${bx + bw - 0.5}%`}
          y2={`${by + bh * 0.28}%`}
          stroke="#f43f5e"
          strokeWidth="0.35"
          strokeDasharray="1.2 1"
          opacity="0.8"
          className="animate-pulse"
        />
        <g opacity="0.65">
          <line
            x1={`${bx + bw / 2 - 1.2}%`}
            y1={`${by + bh / 2}%`}
            x2={`${bx + bw / 2 + 1.2}%`}
            y2={`${by + bh / 2}%`}
            stroke="#f43f5e"
            strokeWidth="0.3"
          />
          <line
            x1={`${bx + bw / 2}%`}
            y1={`${by + bh / 2 - 1.2}%`}
            x2={`${bx + bw / 2}%`}
            y2={`${by + bh / 2 + 1.2}%`}
            stroke="#f43f5e"
            strokeWidth="0.3"
          />
        </g>
      </svg>

      <div
        style={{ left: badgeLeft, top: badgeTop }}
        className={`pointer-events-none absolute z-30 flex select-none items-center gap-1.5 rounded-lg border border-rose-500/80 bg-neutral-950/92 sm:gap-2 ${
          compact ? "px-2 py-0.5" : "px-2.5 py-1"
        } text-white shadow-[0_0_16px_rgba(244,63,94,0.45)] backdrop-blur-md transition-all`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
        </span>

        <span className="font-mono text-[10px] font-extrabold tracking-wide text-rose-200 sm:text-[11px]">
          {violationLabel.toUpperCase()}
        </span>

        {confidencePct !== null && (
          <span className="rounded border border-rose-500/30 bg-rose-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-300 sm:text-[10px]">
            {confidencePct}%
          </span>
        )}
      </div>
    </>
  );
}
