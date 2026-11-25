"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { APP_NAME, APP_SUBTITLE } from "@/lib/modules";
import { inicioPorRol } from "@/lib/permisos";
import { ClienteFormDialog } from "../modulo1/cliente-form-dialog";
import { LoginCard } from "../modulo1/login-card";

/** Pantalla de inicio de sesión a pantalla completa (sin sidebar). */
export default function LoginPage() {
  const router = useRouter();
  const [registro, setRegistro] = useState(false);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-slate-950 p-10 text-slate-100 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">{APP_NAME}</p>
            <p className="text-sm text-slate-400">{APP_SUBTITLE}</p>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">Tu banco, en línea y en un solo lugar.</h1>
          <p className="text-slate-400">
            Administra cuentas de ahorro, paga servicios, transfiere a cualquier banco y solicita préstamos de forma segura.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="size-4" /> Acceso protegido con JWT · Contraseñas cifradas · Bloqueo tras 3 intentos
        </p>
      </section>

      <section className="flex items-center justify-center bg-muted/40 p-6">
        <div className="w-full max-w-sm">
          <LoginCard onLogin={(s) => router.replace(inicioPorRol(s.rol))} onRegistrar={() => setRegistro(true)} />
        </div>
      </section>

      <ClienteFormDialog open={registro} onOpenChange={setRegistro} cliente={null} onSaved={() => {}} />
    </div>
  );
}
