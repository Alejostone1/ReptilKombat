import { cn } from "@/lib/utils";
import { STAT_LABELS, type StatKey } from "@/lib/game-engine/stat-labels";

interface StatBarProps {
  statKey: StatKey;
  value: number;
  max?: number;
  colorClass?: string;
  compact?: boolean;
}

export function StatBar({ statKey, value, max = 100, colorClass = "bg-reptile-green", compact }: StatBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const label = STAT_LABELS[statKey];

  return (
    <div className={cn("flex items-center gap-2", compact ? "text-[11px]" : "text-xs")}>
      <span
        title={`${label.largo} (${label.corto})`}
        className={cn(
          "shrink-0 font-medium text-foreground-muted",
          compact ? "w-8" : "w-24 whitespace-nowrap",
        )}
      >
        {compact ? label.corto : `${label.emoji} ${label.largo}`}
      </span>
      <div className={cn("relative flex-1 overflow-hidden rounded-full bg-panel-secondary", compact ? "h-1.5" : "h-2")}>
        <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("w-7 shrink-0 text-right font-mono text-foreground", compact && "w-6")}>{value}</span>
    </div>
  );
}
