import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accentClass?: string;
}

export function KpiCard({ icon, label, value, hint, accentClass = "text-reptile-green" }: KpiCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
          <p className={cn("mt-1 text-2xl font-bold", accentClass)}>{value}</p>
          {hint && <p className="mt-0.5 text-[11px] text-foreground-muted">{hint}</p>}
        </div>
        <div className="text-2xl opacity-80">{icon}</div>
      </div>
    </Card>
  );
}
