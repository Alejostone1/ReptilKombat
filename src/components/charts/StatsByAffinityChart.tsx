"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Reptil } from "@/types/reptile";
import { AFFINITIES } from "@/types/affinity";
import { STAT_LABELS, STAT_ORDER } from "@/lib/game-engine/stat-labels";

const STAT_COLORS: Record<(typeof STAT_ORDER)[number], string> = {
  hp: "#35C46A",
  atk: "#E67E22",
  def: "#607D8B",
  spd: "#2ECC71",
  inst: "#16A085",
  adp: "#8E44AD",
};

const STAT_KEYS = STAT_ORDER.map((key) => ({ key, label: STAT_LABELS[key].largo, color: STAT_COLORS[key] }));

export function StatsByAffinityChart({ roster }: { roster: Reptil[] }) {
  const data = AFFINITIES.map((af) => {
    const group = roster.filter((r) => r.afinidad === af);
    const n = group.length || 1;
    const avg = (key: (typeof STAT_KEYS)[number]["key"]) =>
      Math.round((group.reduce((acc, r) => acc + r[key], 0) / n) * 10) / 10;
    return {
      afinidad: af,
      hp: avg("hp"),
      atk: avg("atk"),
      def: avg("def"),
      spd: avg("spd"),
      inst: avg("inst"),
      adp: avg("adp"),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c332c" />
        <XAxis dataKey="afinidad" tick={{ fill: "#8fa89c", fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis tick={{ fill: "#8fa89c", fontSize: 10 }} />
        <Tooltip contentStyle={{ background: "#0a1815", border: "1px solid #1c332c", borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {STAT_KEYS.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
