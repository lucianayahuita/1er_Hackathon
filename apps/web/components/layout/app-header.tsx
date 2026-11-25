"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cerrarSesion, type Sesion } from "@/lib/session";

/** Header con el usuario autenticado y cierre de sesión. */
export function AppHeader({ sesion }: { sesion: Sesion }) {
  const router = useRouter();
  const iniciales = `${sesion.nombres[0] ?? ""}${sesion.apellidos[0] ?? ""}`.toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-4 border-b bg-background/95 px-6 backdrop-blur print:hidden">
      <div className="flex items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback>{iniciales}</AvatarFallback>
        </Avatar>
        <div className="text-sm leading-tight">
          <p className="font-medium">
            {sesion.nombres} {sesion.apellidos}
          </p>
          <p className="text-xs text-muted-foreground">@{sesion.usuario}</p>
        </div>
        <Badge variant="secondary">{sesion.rol === "ADMIN" ? "Administrador" : "Cliente"}</Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            cerrarSesion();
            router.replace("/login");
          }}
        >
          <LogOut /> Salir
        </Button>
      </div>
    </header>
  );
}
