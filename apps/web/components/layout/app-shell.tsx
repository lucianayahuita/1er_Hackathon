"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { getSesion, type Sesion } from "@/lib/session";
import { inicioPorRol, navPermitido, rutaPermitida } from "@/lib/permisos";

/**
 * Protege la app: sin sesión → /login (pantalla completa, sin sidebar).
 * Con sesión → sidebar y header con las secciones permitidas para el rol.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const sync = () => setSesion(getSesion());
    sync();
    setListo(true);
    window.addEventListener("chuno-sesion", sync);
    return () => window.removeEventListener("chuno-sesion", sync);
  }, []);

  const esLogin = pathname === "/login";

  useEffect(() => {
    if (!listo) return;
    if (!sesion && !esLogin) router.replace("/login");
    else if (sesion && esLogin) router.replace(inicioPorRol(sesion.rol));
    else if (sesion && !rutaPermitida(pathname, sesion.rol)) router.replace(inicioPorRol(sesion.rol));
  }, [listo, sesion, esLogin, pathname, router]);

  if (!listo) return null;
  if (esLogin) return <>{!sesion && children}</>;
  if (!sesion || !rutaPermitida(pathname, sesion.rol)) return null;

  return (
    <div className="flex min-h-screen bg-muted/40">
      <AppSidebar items={navPermitido(sesion.rol)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader sesion={sesion} />
        <main className="flex-1 p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
