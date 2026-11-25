import { NAV } from "./modules";
import type { Sesion } from "./session";

type Rol = Sesion["rol"];

/**
 * Qué secciones ve cada rol (el back también valida con JWT; esto solo ordena la UI).
 * - ADMIN: todo.
 * - CLIENTE: sus operaciones bancarias (no gestión de clientes ni dashboard global).
 */
const PERMISOS: Record<string, Rol[]> = {
  "/": ["ADMIN"],
  "/modulo1": ["ADMIN"],
  "/modulo2": ["ADMIN", "CLIENTE"],
  "/modulo3": ["ADMIN", "CLIENTE"],
  "/modulo4": ["ADMIN", "CLIENTE"],
  "/modulo5": ["ADMIN", "CLIENTE"],
};

export const navPermitido = (rol: Rol) => NAV.filter((item) => (PERMISOS[item.href] ?? ["ADMIN"]).includes(rol));

export function rutaPermitida(pathname: string, rol: Rol) {
  const base = pathname === "/" ? "/" : "/" + pathname.split("/")[1];
  return (PERMISOS[base] ?? ["ADMIN"]).includes(rol);
}

/** Pantalla de inicio tras el login según el rol. */
export const inicioPorRol = (rol: Rol) => navPermitido(rol)[0]?.href ?? "/modulo2";
