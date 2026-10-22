import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "🦎 Reptiles RPG · Game Balance System",
  description:
    "Herramienta profesional de diseño, análisis y balance para el videojuego de reptiles Reptiles RPG.",
};

// viewport-fit=cover habilita env(safe-area-inset-*) (notch / barra de gestos) para la barra de acción del juego.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101e1a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
