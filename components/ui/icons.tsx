import type { SVGProps } from "react";
import { cn } from "@/lib/ui/cn";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, className, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="square"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...rest}
    >
      {children}
    </svg>
  );
}

/**
 * Lock with an animated shackle: closed when `locked`, lifted and swung open
 * otherwise. Pure CSS transition (reduced-motion safe via globals.css).
 */
export function LockIcon({ locked, ...rest }: IconProps & { locked: boolean }) {
  return (
    <Svg {...rest}>
      <path
        d="M5 7V5a3 3 0 0 1 6 0v2"
        style={{
          transformOrigin: "11px 7px",
          transform: locked ? "translateY(0) rotate(0deg)" : "translateY(-1.5px) rotate(28deg)",
          transition: "transform 220ms cubic-bezier(0.3,1.4,0.5,1)",
        }}
      />
      <rect
        x="3.5"
        y="7"
        width="9"
        height="7"
        fill={locked ? "currentColor" : "none"}
        style={{ transition: "fill 120ms" }}
      />
      {locked ? null : <path d="M8 9.5v2" />}
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 8h11M9.5 4l4 4-4 4" />
    </Svg>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 11.5l7-7M5.5 4.5h6v6" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </Svg>
  );
}

export function SoundIcon({ on, ...rest }: IconProps & { on: boolean }) {
  return (
    <Svg {...rest}>
      <path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" />
      {on ? <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.8a6 6 0 0 1 0 8.4" /> : <path d="M11 6l3.5 4M14.5 6L11 10" />}
    </Svg>
  );
}

export function DiceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="2.5" width="11" height="11" />
      <circle cx="5.5" cy="5.5" r="0.6" fill="currentColor" />
      <circle cx="10.5" cy="10.5" r="0.6" fill="currentColor" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" />
    </Svg>
  );
}

export function MutateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 2.5c0 3 8 3 8 5.5s-8 2.5-8 5.5M12 2.5c0 1-1 1.8-2.4 2.4M4 13.5c0-1 1-1.8 2.4-2.4" />
    </Svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 10V2.5M5 5.5l3-3 3 3M3 8.5v5h10v-5" />
    </Svg>
  );
}

export function BookmarkIcon({ filled, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...rest}>
      <path d="M4 2.5h8v11l-4-3-4 3z" fill={filled ? "currentColor" : "none"} />
    </Svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" />
      <path d="M10.5 5.5v-3h-8v8h3" />
    </Svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 2.5V10M5 7l3 3 3-3M3 13.5h10" />
    </Svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 8a5 5 0 1 1-1.5-3.5M13 2.5v3h-3" />
    </Svg>
  );
}
