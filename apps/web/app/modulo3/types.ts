export interface Proveedor {
  id: number;
  codigo: string;
  nombre: string;
  categoria: "LUZ" | "AGUA" | "TELEFONO" | "GAS" | "OTROS";
}

export interface Deuda {
  id: number;
  proveedorId: number;
  codigoCliente: string;
  periodo: string;
  monto: number;
  pagada: boolean;
  titular?: string;
  direccion?: string;
}

export interface Pago {
  id: number;
  clienteId: number;
  cuentaId: number;
  deudaId: number;
  monto: number;
  comprobante: string;
  estado: "COMPLETADO" | "RECHAZADO";
  fecha: string;
  // Campos enriquecidos para la vista
  proveedorNombre?: string;
  proveedorCategoria?: string;
  codigoCliente?: string;
  periodo?: string;
  cuentaNumero?: string;
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
}
