import { Badge } from "./Badge";
import type { EngineConfig } from "@/lib/game-engine/config";
import { classifyWinRate } from "@/lib/game-engine/balance";

const CONFIG = {
  DOMINANTE: { label: "🔴 DOMINANTE", tone: "danger" as const },
  SALUDABLE: { label: "🟢 SALUDABLE", tone: "ok" as const },
  DEBIL: { label: "🟠 DÉBIL", tone: "warn" as const },
};

export function WinRateBadge({ winRate, config }: { winRate: number; config: EngineConfig }) {
  const clase = classifyWinRate(winRate, config);
  const c = CONFIG[clase];
  return <Badge tone={c.tone}>{c.label} · {winRate.toFixed(1)}%</Badge>;
}
