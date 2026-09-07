"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Modal de login que reutiliza /api/admin/login (mismo sistema de sesión HMAC que /admin). */
export function AdminLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function entrar() {
    setSubmitting(true);
    setError(null);
    const ok = await login(password);
    setSubmitting(false);
    if (!ok) {
      setError("Contraseña incorrecta.");
      return;
    }
    setPassword("");
    onClose();
    router.push("/admin");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs px-4"
          >
            <Card className="p-5">
              <CardHeader>
                <CardTitle>🔒 Acceso administrador</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    entrar();
                  }}
                >
                  <Input
                    type="password"
                    autoFocus
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {error && <p className="text-xs text-state-danger">{error}</p>}
                  <Button type="submit" disabled={submitting} className="w-full">
                    Entrar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
