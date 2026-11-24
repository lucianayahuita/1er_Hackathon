import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const nombres = ['Ana Rojas', 'Carlos Mendoza', 'María Quispe', 'Jorge Vargas', 'Lucía Fernández',
  'Pedro Gutiérrez', 'Sofía Mamani', 'Diego Flores', 'Valeria Castro', 'Andrés Choque'];
const categorias = ['Administración', 'Finanzas', 'Operaciones', 'Tecnología'];

async function main() {
  await prisma.registro.deleteMany();
  await prisma.registro.createMany({
    data: nombres.map((nombre, i) => ({
      codigo: `REG-${String(i + 1).padStart(3, '0')}`,
      nombre,
      descripcion: `Registro de ejemplo ${i + 1}`,
      categoria: categorias[i % categorias.length],
      monto: 3000 + i * 750,
      fecha: new Date(2024, i % 12, 1 + i),
      activo: i !== 7,
    })),
  });
  console.log('Seed OK');
}

main().finally(() => prisma.$disconnect());
