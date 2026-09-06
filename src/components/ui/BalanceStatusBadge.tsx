import { Badge } from "./Badge";
import type { EstadoBalance } from "@/types/reptile";

const CONFIG: Record<EstadoBalance, { label: string; tone: "ok" | "warn" | "danger" }> = {
  APTO: { label: "🟢 APTO", tone: "ok" },
  REVISAR: { label: "🟡 REVISAR", tone: "warn" },
  RIESGO_ALTO: { label: "🔴 RIESGO ALTO", tone: "danger" },
};

export function BalanceStatusBadge({ estado }: { estado: EstadoBalance }) {
  const c = CONFIG[estado];
  return <Badge tone={c.tone}>{c.label}</Badge>;
}
