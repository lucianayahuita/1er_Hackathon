import { PrismaClient, EstadoPrestamo } from '@prisma/client';

const prisma = new PrismaClient();

function cuotaFrancesa(monto: number, tasaAnual: number, plazoMeses: number): number {
  const i = tasaAnual / 12 / 100;
  const cuota = i === 0 ? monto / plazoMeses : monto * i / (1 - Math.pow(1 + i, -plazoMeses));
  return Math.round((cuota + Number.EPSILON) * 100) / 100;
}

async function main() {
  const prestamos = [
    [1, 1, 25000, 12, 24, EstadoPrestamo.SOLICITADO],
    [2, 2, 18000, 12, 18, EstadoPrestamo.APROBADO],
    [3, 3, 50000, 14, 36, EstadoPrestamo.RECHAZADO],
    [4, 4, 12000, 12, 12, EstadoPrestamo.DESEMBOLSADO],
    [5, 5, 80000, 16, 48, EstadoPrestamo.SOLICITADO],
    [6, 6, 10000, 12, 6, EstadoPrestamo.RECHAZADO],
  ] as const;

  for (const [clienteId, cuentaDesembolsoId, monto, tasaAnual, plazoMeses, estado] of prestamos) {
    await prisma.prestamo.upsert({
      where: { id: clienteId },
      update: {},
      create: {
        clienteId, cuentaDesembolsoId, monto, tasaAnual, plazoMeses,
        cuotaMensual: cuotaFrancesa(monto, tasaAnual, plazoMeses), estado,
      },
    });
  }
  console.log('Seed OK: 6 préstamos de ejemplo');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
