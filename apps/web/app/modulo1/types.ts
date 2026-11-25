// Tipos según contracts/modulo1.md (ms-modulo1 · Clientes)

export interface Cliente {
  id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string | null;
  direccion?: string | null;
  usuario: string;
  rol?: "ADMIN" | "CLIENTE";
  intentosFallidos?: number;
  bloqueado: boolean;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientesStats {
  total: number;
  activos: number;
  inactivos: number;
  bloqueados: number;
}

export type EstadoCliente = "activo" | "inactivo" | "bloqueado";

export const estadoCliente = (c: Cliente): EstadoCliente => (!c.activo ? "inactivo" : c.bloqueado ? "bloqueado" : "activo");
