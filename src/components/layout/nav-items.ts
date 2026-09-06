import {
  LayoutDashboard,
  Rows3,
  GitCompare,
  Zap,
  Grid3x3,
  Trophy,
  Shield,
  Swords,
  FlaskConical,
  PlusCircle,
  Dna,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roster", label: "Roster", icon: Rows3 },
  { href: "/comparador", label: "Comparador", icon: GitCompare },
  { href: "/simulador", label: "Simulador de Daño", icon: Zap },
  { href: "/matchups", label: "Matchups", icon: Grid3x3 },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/afinidades", label: "Afinidades", icon: Swords },
  { href: "/habilidades", label: "Habilidades", icon: FlaskConical },
  { href: "/auditoria", label: "Auditoría", icon: Shield },
  { href: "/nuevo-personaje", label: "Nuevo Personaje", icon: PlusCircle },
  { href: "/familias", label: "Familias", icon: Dna },
  { href: "/configuracion", label: "Configuración", icon: Settings },
] as const;
