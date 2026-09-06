import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "ok" | "warn" | "danger" | "accent";
}

const TONE_CLASSES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-panel-secondary text-foreground-muted border-border-subtle",
  ok: "bg-state-ok/15 text-state-ok border-state-ok/30",
  warn: "bg-state-warn/15 text-state-warn border-state-warn/30",
  danger: "bg-state-danger/15 text-state-danger border-state-danger/30",
  accent: "bg-reptile-green/15 text-reptile-green border-reptile-green/30",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
