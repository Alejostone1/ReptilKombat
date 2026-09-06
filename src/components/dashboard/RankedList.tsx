import Link from "next/link";
import type { Reptil } from "@/types/reptile";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";

interface RankedListProps {
  items: { reptil: Reptil; winRate: number }[];
  accentClass?: string;
}

export function RankedList({ items, accentClass = "text-reptile-green" }: RankedListProps) {
  return (
    <ol className="space-y-1.5">
      {items.map(({ reptil, winRate }, i) => (
        <li key={reptil.id}>
          <Link
            href={`/reptiles/${reptil.id}`}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-panel-secondary"
          >
            <span className="flex items-center gap-2 truncate">
              <span className="w-5 shrink-0 text-xs text-foreground-muted">{i + 1}.</span>
              <span className="truncate text-sm text-foreground">{reptil.nombre}</span>
              <AffinityBadge afinidad={reptil.afinidad} />
            </span>
            <span className={`shrink-0 font-mono text-sm font-semibold ${accentClass}`}>{winRate.toFixed(1)}%</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
