import Link from "next/link";
import type { Reptil } from "@/types/reptile";
import { ReptileImage } from "./ReptileImage";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { StatBar } from "./StatBar";
import { BalanceStatusBadge } from "@/components/ui/BalanceStatusBadge";
import type { EstadoBalance } from "@/types/reptile";
import { Card } from "@/components/ui/Card";

interface ReptileCardProps {
  reptil: Reptil;
  estado?: EstadoBalance;
}

export function ReptileCard({ reptil, estado }: ReptileCardProps) {
  return (
    <Link href={`/reptiles/${reptil.id}`}>
      <Card className="group h-full overflow-hidden transition-colors hover:border-reptile-green/50">
        <ReptileImage nombre={reptil.nombre} nombreCientifico={reptil.nombreCientifico} className="aspect-[4/3] w-full" />
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold leading-tight text-foreground group-hover:text-reptile-green">
                {reptil.nombre}
              </h3>
              <p className="text-xs italic text-foreground-muted">{reptil.nombreCientifico}</p>
            </div>
            {estado && <BalanceStatusBadge estado={estado} />}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <AffinityBadge afinidad={reptil.afinidad} />
            <span className="text-xs text-foreground-muted">{reptil.rolTactico}</span>
          </div>
          <div className="space-y-1 pt-1">
            <StatBar label="HP" value={reptil.hp} compact colorClass="bg-state-ok" />
            <StatBar label="ATK" value={reptil.atk} compact colorClass="bg-affinity-termico" />
            <StatBar label="DEF" value={reptil.def} compact colorClass="bg-affinity-acorazado" />
            <StatBar label="SPD" value={reptil.spd} compact colorClass="bg-affinity-agil" />
          </div>
          <div className="flex items-center justify-between pt-1 text-xs text-foreground-muted">
            <span>BST</span>
            <span className="font-mono font-semibold text-foreground">{reptil.bst}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
