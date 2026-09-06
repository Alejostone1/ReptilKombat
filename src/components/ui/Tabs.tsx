"use client";

import { cn } from "@/lib/utils";

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function Tabs<T extends string>({ value, onChange, options, className }: TabsProps<T>) {
  return (
    <div className={cn("inline-flex rounded-lg border border-border-subtle bg-panel-secondary p-1", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-reptile-green text-[#04120b]"
              : "text-foreground-muted hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
