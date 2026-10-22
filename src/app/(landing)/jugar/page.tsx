"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { FEATURES } from "@/config/features";

interface Modo {
  href: string;
  emoji: string;
  titulo: string;
  descripcion: string;
  accent: string;
}

const MODOS: Modo[] = [
  {
    href: "/jugar/crear",
    emoji: "🤝",
    titulo: "Crear con amigo",
    descripcion: "Genera un código de sala y compártelo. Tu rival lo ingresa desde otro dispositivo, en otra red.",
    accent: "hover:border-reptile-green/60",
  },
  ...(FEATURES.MODE_2V2
    ? [
        {
          href: "/jugar/crear-2v2",
          emoji: "👥",
          titulo: "2 vs 2",
          descripcion: "Cuatro jugadores, dos equipos. Crea la sala y comparte el QR: empieza sola al entrar el cuarto.",
          accent: "hover:border-affinity-venenoso/60",
        } satisfies Modo,
      ]
    : []),
  {
    href: "/jugar/unirse",
    emoji: "🔑",
    titulo: "Unirse con código",
    descripcion: "¿Ya tienes un código? Ingresa y arma tu mazo para entrar directo a la batalla.",
    accent: "hover:border-affinity-agil/60",
  },
  {
    href: "/jugar/aleatorio",
    emoji: "🎲",
    titulo: "Partida aleatoria",
    descripcion: "Entra a la cola y te emparejamos con el primer oponente real disponible.",
    accent: "hover:border-affinity-termico/60",
  },
  {
    href: "/jugar/ia",
    emoji: "🤖",
    titulo: "Contra la IA",
    descripcion: "Un rival que juega en serio. ¡Demuéstrale quién manda!",
    accent: "hover:border-affinity-sensorial/60",
  },
  {
    href: "/jugar/local",
    emoji: "📱",
    titulo: "Este dispositivo",
    descripcion: "Pasa y juega — dos jugadores, un mismo celular o computadora, sin conexión.",
    accent: "hover:border-border-subtle",
  },
];

export default function JugarLobbyPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-foreground-muted">Bienvenido a</p>
        <h1 className="text-3xl font-black text-foreground">⚔️ LA ARENA</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">
          Elige cómo quieres batallar: solo, con amigos o por equipos. ¡Cada ataque cuenta!
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
        {MODOS.map((modo) => (
          <Link key={modo.href} href={modo.href}>
            <Card className={`h-full space-y-2 p-5 transition-colors ${modo.accent}`}>
              <p className="text-3xl">{modo.emoji}</p>
              <p className="text-lg font-bold text-foreground">{modo.titulo}</p>
              <p className="text-sm text-foreground-muted">{modo.descripcion}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
