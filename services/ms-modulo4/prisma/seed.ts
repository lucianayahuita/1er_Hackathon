import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const bancos = [
  { codigo: 'BNB', nombre: 'BNB' },
  { codigo: 'BCP', nombre: 'BCP' },
  { codigo: 'BUNION', nombre: 'Banco Unión' },
  { codigo: 'BMSC', nombre: 'Mercantil Santa Cruz' },
  { codigo: 'BISA', nombre: 'BISA' },
];

const transferencias = [
  {
    claveIdempotencia: 'SEED-TRF-1',
    tipo: 'PROPIA' as const,
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000002',
    bancoDestino: null,
    titularDestino: null,
    monto: 300,
    glosa: 'Traspaso a cuenta de ahorro USD',
    estado: 'COMPLETADA' as const,
    codigoAch: null,
  },
  {
    claveIdempotencia: 'SEED-TRF-2',
    tipo: 'TERCERO' as const,
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000003',
    bancoDestino: null,
    titularDestino: null,
    monto: 450,
    glosa: 'Pago de alquiler',
    estado: 'COMPLETADA' as const,
    codigoAch: null,
  },
  {
    claveIdempotencia: 'SEED-TRF-3',
    tipo: 'INTERBANCARIA' as const,
    clienteId: 2,
    cuentaOrigenId: 3,
    cuentaDestinoNumero: '201-5544332',
    bancoDestino: 'BNB',
    titularDestino: 'Carlos Mendoza',
    monto: 1200,
    glosa: 'Préstamo familiar',
    estado: 'COMPLETADA' as const,
    codigoAch: 'ACH-482913',
  },
  {
    claveIdempotencia: 'SEED-TRF-4',
    tipo: 'INTERBANCARIA' as const,
    clienteId: 5,
    cuentaOrigenId: 6,
    cuentaDestinoNumero: '305-8811990',
    bancoDestino: 'Banco Unión',
    titularDestino: 'Sofía Mamani',
    monto: 2500,
    glosa: 'Pago a proveedor externo',
    estado: 'COMPLETADA' as const,
    codigoAch: 'ACH-591024',
  },
  {
    claveIdempotencia: 'SEED-TRF-5',
    tipo: 'TERCERO' as const,
    clienteId: 6,
    cuentaOrigenId: 7,
    cuentaDestinoNumero: '1000000009',
    bancoDestino: null,
    titularDestino: null,
    monto: 600,
    glosa: 'Reembolso de gastos',
    estado: 'COMPLETADA' as const,
    codigoAch: null,
  },
];

async function main() {
  for (const banco of bancos) {
    await prisma.banco.upsert({
      where: { codigo: banco.codigo },
      update: { nombre: banco.nombre },
      create: banco,
    });
  }

  for (const transferencia of transferencias) {
    await prisma.transferencia.upsert({
      where: { claveIdempotencia: transferencia.claveIdempotencia },
      update: {},
      create: transferencia,
    });
  }

  console.log('Seed OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
