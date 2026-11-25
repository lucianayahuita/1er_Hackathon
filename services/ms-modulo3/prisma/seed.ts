import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const proveedores = [
  { codigo: 'DELAPAZ', nombre: 'DELAPAZ – Electricidad', categoria: 'LUZ' },
  { codigo: 'ELFEC', nombre: 'ELFEC – Electricidad Cochabamba', categoria: 'LUZ' },
  { codigo: 'EPSAS', nombre: 'EPSAS – Agua potable La Paz/El Alto', categoria: 'AGUA' },
  { codigo: 'SEMAPA', nombre: 'SEMAPA – Agua potable Cochabamba', categoria: 'AGUA' },
  { codigo: 'ENTEL', nombre: 'ENTEL – Telefonía e internet', categoria: 'TELEFONO' },
  { codigo: 'YPFB', nombre: 'YPFB – Gas domiciliario', categoria: 'GAS' },
  { codigo: 'TIGO', nombre: 'TIGO – TV cable e internet', categoria: 'OTROS' },
];

// [codigoProveedor, codigoCliente, periodo, monto]
const deudas: [string, string, string, number][] = [
  ['DELAPAZ', 'MED-10001', '2026-09', 182.4],
  ['DELAPAZ', 'MED-10001', '2026-10', 196.75],
  ['DELAPAZ', 'MED-10001', '2026-11', 175.3],
  ['DELAPAZ', 'MED-10002', '2026-11', 254.9],
  ['ELFEC', 'MED-10006', '2026-10', 143.2],
  ['EPSAS', 'MED-10001', '2026-10', 68.5],
  ['EPSAS', 'MED-10001', '2026-11', 72.1],
  ['EPSAS', 'MED-10003', '2026-11', 95.0],
  ['SEMAPA', 'MED-10007', '2026-11', 81.4],
  ['ENTEL', 'MED-10002', '2026-09', 120.0],
  ['ENTEL', 'MED-10002', '2026-10', 120.0],
  ['ENTEL', 'MED-10004', '2026-11', 199.0],
  ['YPFB', 'MED-10003', '2026-10', 34.6],
  ['YPFB', 'MED-10003', '2026-11', 38.9],
  ['TIGO', 'MED-10005', '2026-11', 289.0],
  ['TIGO', 'MED-10005', '2026-10', 289.0],
];

async function main() {
  await prisma.pago.deleteMany();
  await prisma.deuda.deleteMany();
  await prisma.proveedor.deleteMany();

  const ids: Record<string, number> = {};
  for (const proveedor of proveedores) {
    const creado = await prisma.proveedor.create({ data: proveedor });
    ids[proveedor.codigo] = creado.id;
  }

  await prisma.deuda.createMany({
    data: deudas.map(([codigoProveedor, codigoCliente, periodo, monto]) => ({
      proveedorId: ids[codigoProveedor],
      codigoCliente,
      periodo,
      monto,
    })),
  });

  console.log(`Seed OK: ${proveedores.length} proveedores, ${deudas.length} deudas pendientes`);
}

main().finally(() => prisma.$disconnect());
