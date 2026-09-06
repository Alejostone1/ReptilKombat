"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Reptil } from "@/types/reptile";
import { AFFINITIES, AFFINITY_META } from "@/types/affinity";

const STATS = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
  { key: "inst", label: "INST" },
  { key: "adp", label: "ADP" },
] as const;

/** Perfil promedio de estadísticas por afinidad, superpuesto en un único radar. */
export function AffinityRadarChart({ roster }: { roster: Reptil[] }) {
  const data = STATS.map((stat) => {
    const row: Record<string, string | number> = { stat: stat.label };
    for (const af of AFFINITIES) {
      const group = roster.filter((r) => r.afinidad === af);
      const n = group.length || 1;
      row[af] = Math.round((group.reduce((acc, r) => acc + r[stat.key], 0) / n) * 10) / 10;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart data={data} outerRadius="65%">
        <PolarGrid stroke="#1c332c" />
        <PolarAngleAxis dataKey="stat" tick={{ fill: "#8fa89c", fontSize: 11 }} />
        {AFFINITIES.map((af) => (
          <Radar
            key={af}
            name={af}
            dataKey={af}
            stroke={AFFINITY_META[af].color}
            fill={AFFINITY_META[af].color}
            fillOpacity={0.06}
            strokeWidth={1.5}
          />
        ))}
        <Tooltip contentStyle={{ background: "#0a1815", border: "1px solid #1c332c", borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
