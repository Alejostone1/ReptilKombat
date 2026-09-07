"use client";

import { AnimatePresence, motion } from "framer-motion";

export function ConnectionBanner({ conexion }: { conexion: "conectando" | "conectado" | "reconectando" }) {
  return (
    <AnimatePresence>
      {conexion !== "conectado" && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-state-warn/50 bg-state-warn/15 px-4 py-2 text-xs font-semibold text-state-warn shadow-lg"
        >
          {conexion === "conectando" ? "Conectando..." : "🔄 Conexión perdida — intentando reconectar..."}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
