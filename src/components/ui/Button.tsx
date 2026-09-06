import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md";
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-reptile-green text-[#04120b] hover:bg-reptile-green/90 font-semibold",
  secondary: "bg-panel-secondary text-foreground hover:bg-panel-secondary/70 border border-border-subtle",
  outline: "border border-border-subtle text-foreground hover:bg-panel-secondary",
  ghost: "text-foreground-muted hover:text-foreground hover:bg-panel-secondary",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
