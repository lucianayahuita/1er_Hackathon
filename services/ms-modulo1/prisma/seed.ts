import { PrismaClient } from '@prisma/client';
import { hashearPassword } from '../src/clientes/password';

const prisma = new PrismaClient();
const datos = [
  ['8456123', 'María', 'Quispe Rojas', 'mquispe', 'La Paz'],
  ['7345120', 'Carlos', 'Mendoza Vargas', 'cmendoza', 'Santa Cruz'],
  ['6823451', 'Ana', 'Rojas Mamani', 'arojas', 'Cochabamba'],
  ['9123456', 'Jorge', 'Vargas Choque', 'jvargas', 'El Alto'],
  ['5678901', 'Lucía', 'Fernández Paz', 'lfernandez', 'Sucre'],
  ['4567892', 'Pedro', 'Gutiérrez Flores', 'pgutierrez', 'Tarija'],
  ['7890123', 'Sofía', 'Mamani Castro', 'smamani', 'Oruro'],
  ['8901234', 'Diego', 'Flores Condori', 'dflores', 'Potosí'],
];

async function main() {
  for (const [i, [ci, nombres, apellidos, usuario, ciudad]] of datos.entries()) {
    // Repetir el seed no borra clientes ni sobrescribe datos/credenciales existentes.
    await prisma.cliente.upsert({
      where: { ci }, update: {},
      create: {
        ci, nombres, apellidos, usuario, email: `${usuario}@mail.com`,
        telefono: `71${String(234567 + i)}`, direccion: `Av. Principal ${100 + i}, ${ciudad}`,
        passwordHash: hashearPassword('Segura2026'),
        activo: i !== 6, bloqueado: i === 7, intentosFallidos: i === 7 ? 3 : 0,
      },
    });
  }
  const usuarioAdmin = process.env.ADMIN_USUARIO;
  const passwordAdmin = process.env.ADMIN_PASSWORD;
  if (usuarioAdmin && passwordAdmin) {
    if (passwordAdmin.length < 8) throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');
    const existente = await prisma.cliente.findUnique({ where: { usuario: usuarioAdmin } });
    if (existente && existente.rol !== 'ADMIN') {
      throw new Error('ADMIN_USUARIO ya pertenece a un cliente. Elige otro usuario para el administrador.');
    }
    if (!existente) {
      await prisma.cliente.create({
        data: {
          ci: 'ADMIN-CHUNO', nombres: 'Administrador', apellidos: 'Chuno Banca',
          email: 'admin@chuno.local', usuario: usuarioAdmin,
          passwordHash: hashearPassword(passwordAdmin), rol: 'ADMIN',
        },
      });
    }
    console.log('Administrador configurado (el seed no cambia su contraseña ni su estado si ya existe)');
  }
  console.log('Seed OK: 8 clientes de ejemplo (contraseña inicial: Segura2026)');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
