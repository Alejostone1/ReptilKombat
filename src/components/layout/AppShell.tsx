"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { GlobalSearch } from "./GlobalSearch";
import { RosterProvider } from "./RosterProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="hidden md:flex" />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <Sidebar className="relative z-50 flex" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border-subtle bg-panel px-4 py-3">
          <button className="md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Abrir menú">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1">
            <GlobalSearch />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <RosterProvider>{children}</RosterProvider>
        </main>
      </div>
    </div>
  );
}
