import { cn } from "@/lib/utils";

const SIZE = {
  sm: "h-[34px] w-[34px]",
  md: "h-[52px] w-[52px]",
  lg: "h-[62px] w-[62px]",
  xl: "h-[76px] w-[76px]",
} as const;

/** Inline SVG brand mark — avoids broken <img> when SVG XML is invalid/unserved. */
export function BrandEmblem({
  size = "sm",
  className,
  decorative = true,
}: {
  size?: keyof typeof SIZE;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={cn("shrink-0 drop-shadow-sm", SIZE[size], className)}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Indian Army"}
    >
      <circle cx="32" cy="32" r="30" fill="#14568c" />
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke="#2ea8d5"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="#fbf0e4"
        strokeWidth="1"
        opacity="0.35"
      />
      <circle cx="32" cy="28" r="9" fill="none" stroke="#fbf0e4" strokeWidth="1.6" />
      <circle cx="32" cy="28" r="2.2" fill="#a85711" />
      <g stroke="#fbf0e4" strokeWidth="1.2" strokeLinecap="round">
        <line x1="32" y1="19.5" x2="32" y2="21.5" />
        <line x1="32" y1="34.5" x2="32" y2="36.5" />
        <line x1="23.5" y1="28" x2="25.5" y2="28" />
        <line x1="38.5" y1="28" x2="40.5" y2="28" />
        <line x1="25.9" y1="21.9" x2="27.3" y2="23.3" />
        <line x1="36.7" y1="32.7" x2="38.1" y2="34.1" />
        <line x1="25.9" y1="34.1" x2="27.3" y2="32.7" />
        <line x1="36.7" y1="23.3" x2="38.1" y2="21.9" />
      </g>
      <path
        d="M22 40.5 L32 48 L42 40.5 L42 44.5 C42 47 32 52 32 52 C32 52 22 47 22 44.5 Z"
        fill="#fbf0e4"
        opacity="0.92"
      />
      <path
        d="M26 42 L32 46.5 L38 42"
        fill="none"
        stroke="#14568c"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
