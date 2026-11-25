"use client";

import { toast } from "sonner";

/**
 * Sesión del frontend contra ms-modulo1 (Clientes).
 * El back exige JWT (Bearer) para listar/editar/dar de baja; el token se obtiene con POST /clientes/login.
 */
const KEY = "chuno_sesion";

export interface Sesion {
  id: number;
  nombres: string;
  apellidos: string;
  usuario: string;
  rol: "ADMIN" | "CLIENTE";
  access_token: string;
  expira: number; // epoch ms
}

export function getSesion(): Sesion | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Sesion | null;
    if (!s || s.expira < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export function guardarSesion(s: Omit<Sesion, "expira"> & { expires_in: number }) {
  const sesion: Sesion = {
    id: s.id,
    nombres: s.nombres,
    apellidos: s.apellidos,
    usuario: s.usuario,
    rol: s.rol,
    access_token: s.access_token,
    expira: Date.now() + s.expires_in * 1000,
  };
  localStorage.setItem(KEY, JSON.stringify(sesion));
  window.dispatchEvent(new Event("chuno-sesion"));
  return sesion;
}

export function cerrarSesion() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("chuno-sesion"));
}

/** Llamada a ms-modulo1 vía gateway (/api/m1) con el token de la sesión. Muestra toast si falla. */
export async function m1<T>(path: string, init?: RequestInit & { silencioso?: boolean }): Promise<T> {
  const sesion = getSesion();
  const res = await fetch(`/api/m1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(sesion ? { Authorization: `Bearer ${sesion.access_token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(", ") : body.message ?? message;
    } catch {}
    if (res.status === 401 && sesion) cerrarSesion();
    if (!init?.silencioso) toast.error(message);
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
