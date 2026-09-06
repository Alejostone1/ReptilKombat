"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Reptil } from "@/types/reptile";

const BUCKET_SIZE = 10;

export function BstHistogram({ roster }: { roster: Reptil[] }) {
  const buckets = new Map<number, number>();
  for (const r of roster) {
    const bucket = Math.floor(r.bst / BUCKET_SIZE) * BUCKET_SIZE;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  const data = Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => ({ rango: `${bucket}-${bucket + BUCKET_SIZE - 1}`, personajes: count }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c332c" />
        <XAxis dataKey="rango" tick={{ fill: "#8fa89c", fontSize: 10 }} />
        <YAxis tick={{ fill: "#8fa89c", fontSize: 10 }} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#0a1815", border: "1px solid #1c332c", borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="personajes" fill="#35C46A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
