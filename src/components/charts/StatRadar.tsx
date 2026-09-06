"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export interface RadarPoint {
  label: string;
  a: number;
  b?: number;
}

interface StatRadarProps {
  data: RadarPoint[];
  nameA?: string;
  nameB?: string;
  colorA?: string;
  colorB?: string;
  height?: number;
}

export function StatRadar({
  data,
  nameA = "A",
  nameB,
  colorA = "#35C46A",
  colorB = "#E67E22",
  height = 280,
}: StatRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#1c332c" />
        <PolarAngleAxis dataKey="label" tick={{ fill: "#8fa89c", fontSize: 11 }} />
        <PolarRadiusAxis tick={{ fill: "#8fa89c", fontSize: 9 }} axisLine={false} />
        <Radar name={nameA} dataKey="a" stroke={colorA} fill={colorA} fillOpacity={0.35} />
        {nameB && <Radar name={nameB} dataKey="b" stroke={colorB} fill={colorB} fillOpacity={0.28} />}
        <Tooltip contentStyle={{ background: "#0a1815", border: "1px solid #1c332c", borderRadius: 8, fontSize: 12 }} />
        {nameB && <Legend wrapperStyle={{ fontSize: 12 }} />}
      </RadarChart>
    </ResponsiveContainer>
  );
}
