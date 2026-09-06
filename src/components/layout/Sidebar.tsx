"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <aside className={cn("flex h-full w-64 flex-col border-r border-border-subtle bg-panel", className)}>
      <div className="flex items-center gap-2 border-b border-border-subtle px-5 py-5">
        <span className="text-2xl">🦎</span>
        <div>
          <p className="text-sm font-bold leading-tight text-foreground">REPTILES RPG</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-reptile-green">Game Balance System</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-reptile-green/15 text-reptile-green"
                  : "text-foreground-muted hover:bg-panel-secondary hover:text-foreground",
              )}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border-subtle px-5 py-3 text-[10px] text-foreground-muted">
        40 reptiles · 8 afinidades · 160 habilidades
      </div>
    </aside>
  );
}
