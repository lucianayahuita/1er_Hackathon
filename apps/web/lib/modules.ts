import { LayoutDashboard, Users, CalendarCheck, FileText, Wallet, type LucideIcon } from "lucide-react";

/**
 * ÚNICO lugar para renombrar el dominio del kata (lo edita Axl en el minuto 0).
 */
export const APP_NAME = "Sistema Kata";
export const APP_SUBTITLE = "Plataforma de gestión";

export type ModuleKey = "m1" | "m2" | "m3" | "m4";

export interface ModuleDef {
  key: ModuleKey;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  entity: string; // singular, ej. "Funcionario"
}

export const MODULES: ModuleDef[] = [
  { key: "m1", href: "/modulo1", title: "Módulo 1", description: "Entidad central: alta, modificación y baja", icon: Users, entity: "Registro" },
  { key: "m2", href: "/modulo2", title: "Módulo 2", description: "Módulo con regla de negocio", icon: CalendarCheck, entity: "Registro" },
  { key: "m3", href: "/modulo3", title: "Módulo 3", description: "Documentos parametrizables", icon: FileText, entity: "Registro" },
  { key: "m4", href: "/modulo4", title: "Módulo 4", description: "Generación y almacenamiento", icon: Wallet, entity: "Registro" },
];

export const NAV = [{ href: "/", title: "Dashboard", icon: LayoutDashboard }, ...MODULES];

export const getModule = (key: ModuleKey) => MODULES.find((m) => m.key === key)!;
