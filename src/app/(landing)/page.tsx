"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRoster } from "@/lib/hooks/useRoster";

const PARTICULAS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 100}%`,
  delay: (i % 6) * 0.7,
  duracion: 6 + (i % 5),
  tam: 8 + (i % 4) * 4,
}));

export default function InicioPage() {
  const { roster, abilities } = useRoster();

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-12 text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICULAS.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-reptile-green/20 blur-sm"
            style={{ left: p.left, width: p.tam, height: p.tam, bottom: -20 }}
            animate={{ y: [-0, -600], opacity: [0, 0.8, 0] }}
            transition={{ duration: p.duracion, delay: p.delay, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 text-5xl sm:text-7xl"
        >
          <motion.span
            initial={{ x: -60, rotate: -15, opacity: 0 }}
            animate={{ x: 0, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
          >
            🦎
          </motion.span>
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ delay: 1, duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            className="text-2xl font-black text-state-danger sm:text-3xl"
          >
            VS
          </motion.span>
          <motion.span
            initial={{ x: 60, rotate: 15, opacity: 0 }}
            animate={{ x: 0, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
          >
            🐊
          </motion.span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl">REPTILES RPG</h1>
          <p className="mt-3 text-sm uppercase tracking-[0.3em] text-reptile-green sm:text-base">
            Combate por afinidades · Batallas en tiempo real
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="max-w-md text-sm text-foreground-muted sm:text-base"
        >
          Arma tu mazo de reptiles reales, explota ventajas de afinidad y derrota a otros jugadores en línea, contra la
          IA o cara a cara en el mismo dispositivo.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Link href="/jugar">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block rounded-xl bg-reptile-green px-10 py-4 text-lg font-black uppercase tracking-wide text-[#04120b] shadow-[0_0_30px_rgba(74,222,128,0.35)]"
            >
              ⚔️ Jugar
            </motion.span>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-xs text-foreground-muted"
        >
          {roster.length || 40} reptiles · {abilities.length || 160} habilidades ·{" "}
          <Link href="/dashboard" className="underline decoration-dotted hover:text-foreground">
            Panel de balance
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
