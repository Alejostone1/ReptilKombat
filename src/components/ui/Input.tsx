import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border-subtle bg-panel-secondary px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none focus:border-reptile-green/60 focus:ring-1 focus:ring-reptile-green/40",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-border-subtle bg-panel-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-reptile-green/60 focus:ring-1 focus:ring-reptile-green/40",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
