import type { Proveedor, Deuda, Pago, ClienteOption, CuentaOption } from "./types";

export const MOCK_PROVEEDORES: Proveedor[] = [
  { id: 1, codigo: "DELAPAZ", nombre: "DELAPAZ – Electricidad La Paz", categoria: "LUZ" },
  { id: 2, codigo: "ELFEC", nombre: "ELFEC – Energía Eléctrica Cochabamba", categoria: "LUZ" },
  { id: 3, codigo: "EPSAS", nombre: "EPSAS – Agua Potable La Paz/El Alto", categoria: "AGUA" },
  { id: 4, codigo: "SEMAPA", nombre: "SEMAPA – Agua Potable Cochabamba", categoria: "AGUA" },
  { id: 5, codigo: "ENTEL", nombre: "ENTEL – Telefonía Móvil y Hogar", categoria: "TELEFONO" },
  { id: 6, codigo: "TIGO", nombre: "TIGO – Internet Fibra y Telefonía", categoria: "TELEFONO" },
  { id: 7, codigo: "YPFB", nombre: "YPFB Redes de Gas Domiciliario", categoria: "GAS" },
  { id: 8, codigo: "EMDIGAS", nombre: "EMDIGAS – Gas Domiciliario", categoria: "GAS" },
];

export const MOCK_DEUDAS: Deuda[] = [
  { id: 101, proveedorId: 1, codigoCliente: "MED-10001", periodo: "2026-10", monto: 185.50, pagada: false, titular: "María Quispe Rojas", direccion: "Av. Arce 2345" },
  { id: 102, proveedorId: 1, codigoCliente: "MED-10001", periodo: "2026-11", monto: 195.00, pagada: false, titular: "María Quispe Rojas", direccion: "Av. Arce 2345" },
  { id: 103, proveedorId: 2, codigoCliente: "NIS-44821", periodo: "2026-10", monto: 142.30, pagada: false, titular: "Carlos Mamani Quispe", direccion: "Calle Jordán 342" },
  { id: 104, proveedorId: 3, codigoCliente: "AGU-99021", periodo: "2026-10", monto: 78.40, pagada: false, titular: "María Quispe Rojas", direccion: "Av. Arce 2345" },
  { id: 105, proveedorId: 4, codigoCliente: "SEM-55100", periodo: "2026-10", monto: 65.00, pagada: false, titular: "Carlos Mamani Quispe", direccion: "Calle Jordán 342" },
  { id: 106, proveedorId: 5, codigoCliente: "71234567", periodo: "2026-11", monto: 150.00, pagada: false, titular: "María Quispe Rojas" },
  { id: 107, proveedorId: 6, codigoCliente: "76543210", periodo: "2026-11", monto: 220.00, pagada: false, titular: "Carlos Mamani Quispe" },
  { id: 108, proveedorId: 7, codigoCliente: "GAS-88410", periodo: "2026-10", monto: 35.80, pagada: false, titular: "María Quispe Rojas", direccion: "Av. Arce 2345" },
];

export const MOCK_CLIENTES: ClienteOption[] = [
  { id: 1, nombres: "María", apellidos: "Quispe Rojas", ci: "8456123" },
  { id: 2, nombres: "Carlos", apellidos: "Mamani Quispe", ci: "4892135" },
  { id: 3, nombres: "Luciana", apellidos: "Flores Terán", ci: "6712390" },
];

export const MOCK_CUENTAS: CuentaOption[] = [
  { id: 1, numero: "1000000001", clienteId: 1, moneda: "BOB", saldo: 5420.50 },
  { id: 2, numero: "1000000002", clienteId: 1, moneda: "USD", saldo: 850.00 },
  { id: 3, numero: "1000000003", clienteId: 2, moneda: "BOB", saldo: 3200.00 },
  { id: 4, numero: "1000000004", clienteId: 3, moneda: "BOB", saldo: 11800.20 },
];

export const MOCK_PAGOS_INICIALES: Pago[] = [
  {
    id: 901,
    clienteId: 1,
    cuentaId: 1,
    deudaId: 99,
    monto: 165.00,
    comprobante: "PAG-20261120-0012",
    estado: "COMPLETADO",
    fecha: "2026-11-20T14:32:00.000Z",
    proveedorNombre: "DELAPAZ – Electricidad La Paz",
    proveedorCategoria: "LUZ",
    codigoCliente: "MED-10001",
    periodo: "2026-09",
    cuentaNumero: "1000000001",
    clienteNombre: "María Quispe Rojas",
  },
  {
    id: 902,
    clienteId: 1,
    cuentaId: 1,
    deudaId: 98,
    monto: 74.20,
    comprobante: "PAG-20261121-0045",
    estado: "COMPLETADO",
    fecha: "2026-11-21T09:15:00.000Z",
    proveedorNombre: "EPSAS – Agua Potable La Paz/El Alto",
    proveedorCategoria: "AGUA",
    codigoCliente: "AGU-99021",
    periodo: "2026-09",
    cuentaNumero: "1000000001",
    clienteNombre: "María Quispe Rojas",
  },
  {
    id: 903,
    clienteId: 2,
    cuentaId: 3,
    deudaId: 97,
    monto: 150.00,
    comprobante: "PAG-20261123-0089",
    estado: "COMPLETADO",
    fecha: "2026-11-23T16:40:00.000Z",
    proveedorNombre: "ENTEL – Telefonía Móvil y Hogar",
    proveedorCategoria: "TELEFONO",
    codigoCliente: "71234567",
    periodo: "2026-10",
    cuentaNumero: "1000000003",
    clienteNombre: "Carlos Mamani Quispe",
  },
];
