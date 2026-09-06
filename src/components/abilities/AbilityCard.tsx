import type { Habilidad } from "@/types/ability";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

const CATEGORIA_ICON: Record<Habilidad["categoria"], string> = {
  Fisica: "⚔️",
  Tecnica: "🌀",
  Control: "🎯",
  Estado: "🧬",
};

export function AbilityCard({ habilidad, ownerName }: { habilidad: Habilidad; ownerName?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-foreground">
          {CATEGORIA_ICON[habilidad.categoria]} {habilidad.nombre}
        </h4>
        <AffinityBadge afinidad={habilidad.afinidad} />
      </div>
      {ownerName && (
        <Link href={`/reptiles/${habilidad.propietarioId}`} className="text-xs text-foreground-muted hover:text-reptile-green">
          {ownerName}
        </Link>
      )}
      <p className="mt-2 text-sm text-foreground-muted">{habilidad.descripcion ?? habilidad.efecto}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="accent">Categoría: {habilidad.categoria}</Badge>
        <Badge>Potencia {habilidad.potencia}</Badge>
        <Badge>Precisión {habilidad.precision}%</Badge>
        {habilidad.cooldown != null && <Badge>Costo {habilidad.cooldown}</Badge>}
      </div>
    </Card>
  );
}
