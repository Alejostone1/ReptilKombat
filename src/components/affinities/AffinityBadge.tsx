import type { Afinidad } from "@/types/affinity";
import { AFFINITY_META } from "@/types/affinity";
import { cn } from "@/lib/utils";

interface AffinityBadgeProps {
  afinidad: Afinidad;
  className?: string;
  size?: "sm" | "md";
}

export function AffinityBadge({ afinidad, className, size = "sm" }: AffinityBadgeProps) {
  const meta = AFFINITY_META[afinidad];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
      style={{
        borderColor: `${meta.color}55`,
        backgroundColor: `${meta.color}1F`,
        color: meta.color,
      }}
    >
      <span>{meta.emoji}</span>
      {afinidad}
    </span>
  );
}
