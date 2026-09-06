import { cn } from "@/lib/utils";

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  colorClass?: string;
  compact?: boolean;
}

export function StatBar({ label, value, max = 100, colorClass = "bg-reptile-green", compact }: StatBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("flex items-center gap-2", compact ? "text-[11px]" : "text-xs")}>
      <span className={cn("w-9 shrink-0 font-medium text-foreground-muted", compact && "w-7")}>{label}</span>
      <div className={cn("relative flex-1 overflow-hidden rounded-full bg-panel-secondary", compact ? "h-1.5" : "h-2")}>
        <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("w-7 shrink-0 text-right font-mono text-foreground", compact && "w-6")}>{value}</span>
    </div>
  );
}
