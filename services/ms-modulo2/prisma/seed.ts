import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cuentas = [
  { clienteId: 1, moneda: 'BOB' as const, saldo: 8500 },
  { clienteId: 1, moneda: 'USD' as const, saldo: 1200 },
  { clienteId: 2, moneda: 'BOB' as const, saldo: 4300 },
  { clienteId: 3, moneda: 'BOB' as const, saldo: 0 },
  { clienteId: 4, moneda: 'USD' as const, saldo: 750 },
  { clienteId: 5, moneda: 'BOB' as const, saldo: 12800 },
  { clienteId: 6, moneda: 'BOB' as const, saldo: 2100 },
  { clienteId: 7, moneda: 'USD' as const, saldo: 300 },
  { clienteId: 8, moneda: 'BOB' as const, saldo: 980 },
  { clienteId: 8, moneda: 'USD' as const, saldo: 0 },
];

async function main() {
  await prisma.movimiento.deleteMany();
  await prisma.cuenta.deleteMany();

  for (const datos of cuentas) {
    const cuenta = await prisma.cuenta.create({
      data: { numero: `TEMP-${datos.clienteId}-${datos.moneda}`, ...datos },
    });
    await prisma.cuenta.update({
      where: { id: cuenta.id },
      data: { numero: String(1000000000 + cuenta.id) },
    });
  }

  const primera = await prisma.cuenta.findFirstOrThrow({ orderBy: { id: 'asc' } });
  await prisma.movimiento.createMany({
    data: [
      { cuentaId: primera.id, tipo: 'DEPOSITO', monto: 10000, saldoResultante: 10000, descripcion: 'Depósito inicial' },
      { cuentaId: primera.id, tipo: 'RETIRO', monto: 1500, saldoResultante: 8500, descripcion: 'Retiro en caja' },
    ],
  });
  console.log('Seed OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
