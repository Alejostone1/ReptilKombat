"use client";

import { useCallback, useEffect, useState } from "react";

export function useAdminAuth() {
  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    const res = await fetch("/api/admin/me");
    const json = await res.json();
    setStatus(json.authenticated ? "in" : "out");
  }, []);

  useEffect(() => {
    // setStatus ocurre tras el await, no de forma síncrona — fetch-on-mount estándar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
  }, [check]);

  async function login(password: string) {
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo iniciar sesión.");
      return false;
    }
    setStatus("in");
    return true;
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setStatus("out");
  }

  return { status, error, login, logout };
}
