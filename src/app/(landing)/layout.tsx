"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { RosterProvider } from "@/components/layout/RosterProvider";
import { AdminLoginModal } from "@/components/admin/AdminLoginModal";

export default function LandingLayout({ children }: { children: ReactNode }) {
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🦎</span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">REPTILES RPG</p>
            <p className="text-[9px] font-medium uppercase tracking-widest text-reptile-green">Game Balance System</p>
          </div>
        </Link>
        <button
          onClick={() => setAdminOpen(true)}
          className="text-[10px] font-medium uppercase tracking-widest text-foreground-muted/50 transition-colors hover:text-foreground-muted"
        >
          Admin
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <RosterProvider>{children}</RosterProvider>
      </main>

      <AdminLoginModal open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
}
