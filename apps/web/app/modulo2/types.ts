// Tipos según contracts/modulo2.md (ms-modulo2 · Cuentas de ahorro)

export type Moneda = "BOB" | "USD";

export interface Cuenta {
  id: number;
  numero: string;
  clienteId: number;
  moneda: Moneda;
  saldo: string | number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Movimiento {
  id: number;
  cuentaId: number;
  tipo: "DEPOSITO" | "RETIRO";
  monto: string | number;
  saldoResultante: string | number;
  descripcion?: string | null;
  fecha: string;
}

export interface CuentasStats {
  totalCuentas: number;
  activas: number;
  saldoTotal: number;
}

/** Cliente mínimo que necesitamos de ms-modulo1 (contracts/modulo1.md). */
export interface ClienteResumen {
  id: number;
  ci?: string;
  nombres?: string;
  apellidos?: string;
  activo?: boolean;
}

export const nombreCliente = (c?: ClienteResumen, id?: number) =>
  c?.nombres ? `${c.nombres} ${c.apellidos ?? ""}`.trim() : `Cliente #${c?.id ?? id}`;

export const formatSaldo = (n: number | string, moneda: Moneda = "BOB") =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: moneda }).format(Number(n));

export const formatFechaHora = (d: string) =>
  new Date(d).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" });
