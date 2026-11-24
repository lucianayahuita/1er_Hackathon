import { toast } from "sonner";
import type { ModuleKey } from "./modules";

async function request<T>(mod: ModuleKey, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/${mod}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(", ") : body.message ?? message;
    } catch {}
    toast.error(message);
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(mod: ModuleKey, path: string) => request<T>(mod, path),
  post: <T>(mod: ModuleKey, path: string, body: unknown) => request<T>(mod, path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(mod: ModuleKey, path: string, body?: unknown) =>
    request<T>(mod, path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
};

/** Modelo genérico del template (renombrar campos mañana según contrato) */
export interface Registro {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  categoria: string;
  monto: string | number;
  fecha: string;
  activo: boolean;
}

export interface Stats {
  total: number;
  activos: number;
  inactivos: number;
  montoTotal: number;
  porCategoria: { categoria: string; cantidad: number }[];
}

export const formatMoney = (n: number | string) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(Number(n));
export const formatDate = (d: string) => new Date(d).toLocaleDateString("es-BO");
