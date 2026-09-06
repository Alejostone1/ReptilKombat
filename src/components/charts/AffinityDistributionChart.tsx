"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Reptil } from "@/types/reptile";
import { AFFINITIES, AFFINITY_META } from "@/types/affinity";

export function AffinityDistributionChart({ roster }: { roster: Reptil[] }) {
  const data = AFFINITIES.map((af) => ({
    name: af,
    value: roster.filter((r) => r.afinidad === af).length,
    color: AFFINITY_META[af].color,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} stroke="#0D1C18" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: "#0a1815", border: "1px solid #1c332c", borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
