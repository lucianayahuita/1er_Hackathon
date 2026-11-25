export type TipoTransferencia = "PROPIA" | "TERCERO" | "INTERBANCARIA";

export interface Banco {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Transferencia {
  id: number;
  tipo: TipoTransferencia;
  clienteId: number;
  cuentaOrigenId: number;
  cuentaDestinoNumero: string;
  bancoDestino?: string | null;
  titularDestino?: string | null;
  monto: number | string;
  glosa: string;
  estado: "COMPLETADA" | "RECHAZADA" | "PENDIENTE";
  codigoAch?: string | null;
  claveIdempotencia?: string | null;
  fecha: string;
  // Campos enriquecidos para vista
  cuentaOrigenNumero?: string;
  clienteNombre?: string;
}

export interface ClienteOption {
  id: number;
  nombres: string;
  apellidos: string;
  ci: string;
}

export interface CuentaOption {
  id: number;
  numero: string;
  clienteId: number;
  moneda: "BOB" | "USD";
  saldo: number;
  alias?: string;
}
