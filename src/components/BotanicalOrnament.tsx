import React from 'react';

export const OrnamentalDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D99E3D]/70 to-[#D99E3D]/80" />
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="text-[#E8B14B] shrink-0"
    >
      <path
        d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z"
        fill="currentColor"
      />
    </svg>
    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#D99E3D]/70 to-[#D99E3D]/80" />
  </div>
);

export const BotanicalCornerLeaves: React.FC<{
  className?: string;
  color?: string;
}> = ({ className = '', color = '#D7A352' }) => (
  <svg
    viewBox="0 0 180 140"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M8 10C38 22 68 48 92 84C72 78 46 66 26 42C16 30 10 18 8 10Z"
      fill={color}
      fillOpacity="0.34"
    />
    <path
      d="M52 4C68 24 80 54 84 88C68 72 56 48 52 4Z"
      fill={color}
      fillOpacity="0.26"
    />
    <path
      d="M4 54C32 52 62 62 88 86C62 90 32 82 4 54Z"
      fill={color}
      fillOpacity="0.22"
    />
    <path
      d="M104 20C110 44 106 72 94 94C90 70 94 42 104 20Z"
      fill={color}
      fillOpacity="0.2"
    />
  </svg>
);

export const CardLeafWatermark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 110"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M112 104C94 84 82 58 80 28C96 42 108 68 112 104Z"
      fill="#D8B37C"
      fillOpacity="0.26"
    />
    <path
      d="M98 106C76 92 56 72 44 46C68 54 88 76 98 106Z"
      fill="#D8B37C"
      fillOpacity="0.22"
    />
    <path
      d="M84 108C58 102 36 90 18 72C44 70 68 84 84 108Z"
      fill="#D8B37C"
      fillOpacity="0.18"
    />
  </svg>
);
