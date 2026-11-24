import type { Banco, Transferencia, ClienteOption, CuentaOption } from "./types";

export const MOCK_BANCOS: Banco[] = [
  { id: 1, codigo: "CHUNO", nombre: "Banco Chuno S.A. (Propio)" },
  { id: 2, codigo: "BNB", nombre: "Banco Nacional de Bolivia (BNB)" },
  { id: 3, codigo: "BCP", nombre: "Banco de Crédito de Bolivia (BCP)" },
  { id: 4, codigo: "BUN", nombre: "Banco Unión S.A." },
  { id: 5, codigo: "BMSC", nombre: "Banco Mercantil Santa Cruz" },
  { id: 6, codigo: "BISA", nombre: "Banco BISA S.A." },
];

export const MOCK_CLIENTES: ClienteOption[] = [
  { id: 1, nombres: "María", apellidos: "Quispe Rojas", ci: "8456123" },
  { id: 2, nombres: "Carlos", apellidos: "Mamani Quispe", ci: "4892135" },
  { id: 3, nombres: "Luciana", apellidos: "Flores Terán", ci: "6712390" },
];

export const MOCK_CUENTAS: CuentaOption[] = [
  { id: 1, numero: "1000000001", clienteId: 1, moneda: "BOB", saldo: 5420.50, alias: "Caja de Ahorro Principal" },
  { id: 2, numero: "1000000002", clienteId: 1, moneda: "BOB", saldo: 1200.00, alias: "Ahorro Vacaciones" },
  { id: 3, numero: "1000000003", clienteId: 2, moneda: "BOB", saldo: 3200.00, alias: "Cuenta Sueldo" },
  { id: 4, numero: "1000000004", clienteId: 3, moneda: "BOB", saldo: 11800.20, alias: "Fondo de Emergencia" },
];

export const MOCK_TRANSFERENCIAS_INICIALES: Transferencia[] = [
  {
    id: 501,
    tipo: "PROPIA",
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: "1000000002",
    monto: 300.00,
    glosa: "Traspaso para ahorro mensual",
    estado: "COMPLETADA",
    fecha: "2026-11-22T10:15:00.000Z",
    cuentaOrigenNumero: "1000000001",
    clienteNombre: "María Quispe Rojas",
    titularDestino: "María Quispe Rojas",
  },
  {
    id: 502,
    tipo: "TERCERO",
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: "1000000003",
    monto: 450.00,
    glosa: "Pago compra víveres",
    estado: "COMPLETADA",
    fecha: "2026-11-23T15:20:00.000Z",
    cuentaOrigenNumero: "1000000001",
    clienteNombre: "María Quispe Rojas",
    titularDestino: "Carlos Mamani Quispe",
    bancoDestino: "Banco Chuno S.A.",
  },
  {
    id: 503,
    tipo: "INTERBANCARIA",
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: "201-5544332",
    bancoDestino: "BNB",
    titularDestino: "Roberto Gómez Bolaños",
    monto: 1200.00,
    glosa: "Alquiler departamento Cochabamba",
    estado: "COMPLETADA",
    codigoAch: "ACH-482913",
    fecha: "2026-11-24T11:45:00.000Z",
    cuentaOrigenNumero: "1000000001",
    clienteNombre: "María Quispe Rojas",
  },
];
