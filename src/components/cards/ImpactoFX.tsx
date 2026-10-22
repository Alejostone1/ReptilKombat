"use client";

import { motion } from "framer-motion";
import type { EstiloAtaque, TipoParticula } from "@/lib/card-game/estilo-ataque";

/** Pseudoaleatorio determinista (mismo id + índice = mismas partículas): sin parpadeos entre renders. */
function azar(i: number, k: number, semilla: number): number {
  const x = Math.sin(i * 12.9898 + k * 78.233 + semilla * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

interface ParticulaProps {
  tipo: TipoParticula;
  color: string;
  x: number;
  y: number;
  tam: number;
  giro: number;
  retraso: number;
  duracion: number;
  /** "carga": las partículas convergen hacia la carta; "impacto": salen despedidas. */
  modo: "carga" | "impacto";
}

function Particula({ tipo, color, x, y, tam, giro, retraso, duracion, modo }: ParticulaProps) {
  const desde = modo === "carga" ? { x, y, opacity: 0, scale: 0.4 } : { x: 0, y: 0, opacity: 1, scale: 0.4 };
  // Cada tipo se mueve distinto: las brasas suben, las esquirlas caen, las gotas gotean, etc.
  const gravedad = tipo === "esquirlas" ? 22 : tipo === "gotas" ? 16 : tipo === "brasas" ? -18 : tipo === "burbujas" ? -12 : 0;
  const hasta =
    modo === "carga"
      ? { x: 0, y: 0, opacity: [0, 1, 0], scale: [0.4, 1, 0.3] }
      : { x, y: y + gravedad, opacity: [1, 1, 0], scale: [0.4, 1.15, 0.6], rotate: giro };

  let forma: string;
  let estilo: React.CSSProperties = { width: tam, height: tam, background: color, boxShadow: `0 0 ${tam * 1.5}px ${color}` };
  switch (tipo) {
    case "burbujas":
      forma = "rounded-full";
      estilo = { width: tam * 1.3, height: tam * 1.3, border: `2px solid ${color}`, background: `${color}33` };
      break;
    case "gotas":
      forma = "";
      estilo = { width: tam * 0.8, height: tam, background: color, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", boxShadow: `0 0 ${tam}px ${color}` };
      break;
    case "esquirlas":
      forma = "";
      estilo = { width: tam, height: tam * 0.8, background: color, clipPath: "polygon(50% 0, 100% 70%, 20% 100%, 0 30%)" };
      break;
    case "estelas":
      forma = "rounded-full";
      estilo = { width: tam * 3, height: Math.max(2, tam * 0.35), background: `linear-gradient(90deg, transparent, ${color})`, rotate: `${Math.atan2(y, x)}rad` };
      break;
    case "hojas":
      forma = "";
      estilo = { width: tam * 1.2, height: tam * 0.8, background: color, borderRadius: "0 100% 0 100%" };
      break;
    case "destellos":
      forma = "";
      estilo = { width: tam * 1.6, height: tam * 1.6, background: color, clipPath: "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)" };
      break;
    case "anillos":
      forma = "rounded-full";
      estilo = { width: tam * 1.6, height: tam * 1.6, border: `2px solid ${color}`, background: "transparent" };
      break;
    default:
      forma = "rounded-full";
  }

  return (
    <motion.span
      aria-hidden
      className={`absolute left-1/2 top-1/2 ${forma}`}
      style={{ ...estilo, marginLeft: -tam / 2, marginTop: -tam / 2 }}
      initial={desde}
      animate={hasta}
      transition={{ duration: duracion, delay: retraso, ease: modo === "carga" ? "easeIn" : "easeOut", times: [0, 0.35, 1] }}
    />
  );
}

interface ImpactoFXProps {
  estilo: EstiloAtaque;
  modo: "carga" | "impacto";
  /** Id del ataque: cambia la "semilla" de las partículas y re-dispara el efecto. */
  id: number;
}

/**
 * Efectos visuales sobre una carta: "carga" (energía que se acumula antes de atacar) e "impacto" (onda,
 * destello y partículas propias del tipo del animal; polvo extra si es pesado). Es decoración pura: no
 * recibe ni muestra ningún resultado del combate.
 */
export function ImpactoFX({ estilo, modo, id }: ImpactoFXProps) {
  const n = modo === "carga" ? 7 : estilo.nParticulas;
  const base = modo === "carga" ? 0.45 : 0.75;
  const particulas = Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * Math.PI * 2 + azar(i, 1, id) * 0.8;
    const dist = (modo === "carga" ? 70 : 38 + azar(i, 2, id) * 44) * (estilo.pesado && modo === "impacto" ? 1.15 : 1);
    return {
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist,
      tam: 5 + azar(i, 3, id) * 7,
      giro: (azar(i, 4, id) - 0.5) * 420,
      retraso: azar(i, 5, id) * 0.12,
      duracion: base + azar(i, 6, id) * 0.25,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible" aria-hidden>
      {modo === "impacto" && (
        <>
          {/* Destello de color que cubre la carta un instante */}
          <motion.span
            className="absolute inset-0 rounded-xl"
            style={{ background: `radial-gradient(circle, #fff 0%, ${estilo.color} 45%, transparent 75%)`, mixBlendMode: "screen" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, estilo.critico ? 0.95 : 0.75, 0] }}
            transition={{ duration: 0.45 }}
          />
          {/* Onda expansiva */}
          <motion.span
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{ width: 70, height: 70, marginLeft: -35, marginTop: -35, border: `3px solid ${estilo.color}`, boxShadow: `0 0 18px ${estilo.color}` }}
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: estilo.pesado ? 3 : 2.2, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {estilo.critico && (
            <motion.span
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{ width: 70, height: 70, marginLeft: -35, marginTop: -35, border: `2px solid #fff` }}
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 3.6, opacity: 0 }}
              transition={{ duration: 0.75, delay: 0.08, ease: "easeOut" }}
            />
          )}
          {/* Polvo que levanta un animal pesado al golpear */}
          {estilo.pesado &&
            [-1, 1].map((lado) => (
              <motion.span
                key={lado}
                className="absolute bottom-1 left-1/2 rounded-full bg-white/40 blur-[3px]"
                style={{ width: 26, height: 14, marginLeft: -13 }}
                initial={{ x: 0, opacity: 0.8, scale: 0.4 }}
                animate={{ x: lado * 46, opacity: 0, scale: 1.6 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            ))}
        </>
      )}
      {modo === "carga" && (
        <motion.span
          className="absolute inset-0 rounded-xl"
          style={{ boxShadow: `0 0 26px 6px ${estilo.color}, inset 0 0 18px ${estilo.color}66` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.55, 0.9] }}
          transition={{ duration: 0.65 }}
        />
      )}
      {particulas.map((p, i) => (
        <Particula key={`${id}-${i}`} tipo={estilo.particulas} color={estilo.color} modo={modo} {...p} />
      ))}
    </div>
  );
}
