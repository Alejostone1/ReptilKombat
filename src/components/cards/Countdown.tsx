"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function Countdown({ onFinish }: { onFinish: () => void }) {
  const [valor, setValor] = useState(3);

  useEffect(() => {
    const t = setTimeout(
      () => {
        if (valor === 0) onFinish();
        else setValor((v) => v - 1);
      },
      valor === 0 ? 700 : 800,
    );
    return () => clearTimeout(t);
  }, [valor, onFinish]);

  const mostrarGo = valor === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.p
          key={String(valor)}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className={mostrarGo ? "text-6xl font-black text-reptile-green" : "text-8xl font-black text-foreground"}
        >
          {mostrarGo ? "¡BATALLA!" : valor}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
