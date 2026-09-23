import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { Kbd } from "./Kbd";

export type ButtonVariant = "solid" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Keyboard hint rendered at the right, e.g. "R". */
  kbd?: string;
  /** Leading icon. */
  icon?: ReactNode;
  /** Visually "on" (e.g. SAVED). Sets aria-pressed. */
  pressed?: boolean;
}

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-sans font-medium uppercase tracking-[0.06em] transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35";

const variants: Record<ButtonVariant, string> = {
  solid: "border border-fg bg-fg text-bg hover:bg-bg hover:text-fg",
  outline: "border border-line-strong text-fg hover:border-fg hover:bg-fg hover:text-bg",
  ghost: "border border-transparent text-muted hover:text-fg",
};

const pressedStyle = "border-fg bg-fg text-bg hover:bg-fg hover:text-bg";

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[11px]",
  md: "h-11 px-4 text-xs",
  lg: "h-14 px-6 text-sm",
};

/** Square-cornered, token-driven button. Solid inverts on hover. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", kbd, icon, pressed, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={cn(base, variants[variant], sizes[size], pressed && pressedStyle, className)}
      {...rest}
    >
      {icon}
      {children}
      {kbd ? <Kbd className="ml-1 border-current/30 text-current opacity-60 group-hover/btn:opacity-100">{kbd}</Kbd> : null}
    </button>
  );
});
