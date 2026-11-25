"use client";

import { useState } from "react";
import { Lock, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarSesion, m1, type Sesion } from "@/lib/session";

/** Inicio de sesión (POST /clientes/login). Bloqueo a los 3 intentos lo maneja el back. */
export function LoginCard({ onLogin, onRegistrar }: { onLogin: (s: Sesion) => void; onRegistrar: () => void }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await m1<Omit<Sesion, "expira"> & { expires_in: number }>("/clientes/login", {
        method: "POST",
        body: JSON.stringify({ usuario, password }),
      });
      const s = guardarSesion(r);
      toast.success(`Bienvenido/a, ${s.nombres}`);
      onLogin(s);
    } catch {
      /* toast ya mostrado: "Credenciales inválidas", "Cliente bloqueado", etc. */
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Lock className="size-6" />
          </div>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Ingresa con tu usuario de Chuno Banca. La gestión de clientes requiere rol administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={entrar}>
            <div className="grid gap-1.5">
              <Label htmlFor="usuario">Usuario</Label>
              <Input id="usuario" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={!usuario || !password || enviando}>
              <LogIn /> {enviando ? "Ingresando..." : "Ingresar"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Tras 3 intentos fallidos la cuenta se bloquea.{" "}
              <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={onRegistrar}>
                Registrarme como cliente
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
