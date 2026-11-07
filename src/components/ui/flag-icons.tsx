"use client";

import React, { useId } from "react";

export interface FlagIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Biểu tượng Quốc kỳ Việt Nam (Cờ đỏ sao vàng) hình tròn neumorphic.
 */
export function VietnamFlag({ className = "size-4", ...props }: FlagIconProps) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="11" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="24" height="24" fill="#DA251D" />
        <polygon
          points="12,5.2 13.53,9.9 18.47,9.9 14.47,12.8 16,17.5 12,14.6 8,17.5 9.53,12.8 5.53,9.9 10.47,9.9"
          fill="#FFDA44"
        />
      </g>
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="1"
      />
    </svg>
  );
}

/**
 * Biểu tượng Cờ Vương quốc Anh (Union Jack) đại diện chuẩn quốc tế cho Tiếng Anh.
 */
export function UkFlag({ className = "size-4", ...props }: FlagIconProps) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="11" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* Nền xanh đậm */}
        <rect width="24" height="24" fill="#012169" />

        {/* Chữ thập chéo trắng St Andrew */}
        <path
          d="M0 0 L24 24 M24 0 L0 24"
          stroke="#FFFFFF"
          strokeWidth="4.2"
          strokeLinecap="square"
        />

        {/* Chữ thập chéo đỏ St Patrick */}
        <path
          d="M0 0 L24 24 M24 0 L0 24"
          stroke="#C8102E"
          strokeWidth="2.2"
          strokeLinecap="square"
        />

        {/* Chữ thập chính trắng St George */}
        <path
          d="M12 0 V24 M0 12 H24"
          stroke="#FFFFFF"
          strokeWidth="6.5"
        />

        {/* Chữ thập chính đỏ St George */}
        <path
          d="M12 0 V24 M0 12 H24"
          stroke="#C8102E"
          strokeWidth="3.8"
        />
      </g>
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="1"
      />
    </svg>
  );
}

/**
 * Biểu tượng Cờ Mỹ (Stars & Stripes) cho biến thể en-US.
 */
export function UsFlag({ className = "size-4", ...props }: FlagIconProps) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="11" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* Nền sọc trắng */}
        <rect width="24" height="24" fill="#FFFFFF" />

        {/* 7 sọc đỏ */}
        <rect y="0" width="24" height="1.85" fill="#B22234" />
        <rect y="3.7" width="24" height="1.85" fill="#B22234" />
        <rect y="7.38" width="24" height="1.85" fill="#B22234" />
        <rect y="11.08" width="24" height="1.85" fill="#B22234" />
        <rect y="14.77" width="24" height="1.85" fill="#B22234" />
        <rect y="18.46" width="24" height="1.85" fill="#B22234" />
        <rect y="22.15" width="24" height="1.85" fill="#B22234" />

        {/* Góc xanh canton */}
        <rect x="0" y="0" width="11" height="12.92" fill="#3C3B6E" />

        {/* Các ngôi sao trắng cách điệu */}
        <circle cx="2.5" cy="2.5" r="0.65" fill="#FFFFFF" />
        <circle cx="5.5" cy="2.5" r="0.65" fill="#FFFFFF" />
        <circle cx="8.5" cy="2.5" r="0.65" fill="#FFFFFF" />
        <circle cx="4.0" cy="4.6" r="0.65" fill="#FFFFFF" />
        <circle cx="7.0" cy="4.6" r="0.65" fill="#FFFFFF" />
        <circle cx="2.5" cy="6.7" r="0.65" fill="#FFFFFF" />
        <circle cx="5.5" cy="6.7" r="0.65" fill="#FFFFFF" />
        <circle cx="8.5" cy="6.7" r="0.65" fill="#FFFFFF" />
        <circle cx="4.0" cy="8.8" r="0.65" fill="#FFFFFF" />
        <circle cx="7.0" cy="8.8" r="0.65" fill="#FFFFFF" />
        <circle cx="2.5" cy="10.9" r="0.65" fill="#FFFFFF" />
        <circle cx="5.5" cy="10.9" r="0.65" fill="#FFFFFF" />
        <circle cx="8.5" cy="10.9" r="0.65" fill="#FFFFFF" />
      </g>
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="1"
      />
    </svg>
  );
}

export interface EnglishFlagProps extends FlagIconProps {
  variant?: "uk" | "us";
}

/**
 * Biểu tượng Tiếng Anh (mặc định UK flag, có thể chuyển sang US flag).
 */
export function EnglishFlag({ variant = "uk", ...props }: EnglishFlagProps) {
  if (variant === "us") {
    return <UsFlag {...props} />;
  }
  return <UkFlag {...props} />;
}

export const VietnameseFlag = VietnamFlag;
export const VietnamFlagIcon = VietnamFlag;
export const EnglishFlagIcon = EnglishFlag;

