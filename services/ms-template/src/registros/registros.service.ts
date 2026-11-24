import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegistroDto } from './dto/create-registro.dto';
import { UpdateRegistroDto } from './dto/update-registro.dto';

@Injectable()
export class RegistrosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(q?: string, activo?: boolean) {
    return this.prisma.registro.findMany({
      where: {
        ...(activo !== undefined ? { activo } : {}),
        ...(q
          ? { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { codigo: { contains: q, mode: 'insensitive' } }] }
          : {}),
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const registro = await this.prisma.registro.findUnique({ where: { id } });
    if (!registro) throw new NotFoundException(`Registro ${id} no existe`);
    return registro;
  }

  async create(dto: CreateRegistroDto) {
    const existe = await this.prisma.registro.findUnique({ where: { codigo: dto.codigo } });
    if (existe) throw new ConflictException(`El código ${dto.codigo} ya existe`);
    return this.prisma.registro.create({ data: { ...dto, fecha: dto.fecha ? new Date(dto.fecha) : undefined } });
  }

  async update(id: number, dto: UpdateRegistroDto) {
    await this.findOne(id);
    return this.prisma.registro.update({
      where: { id },
      data: { ...dto, fecha: dto.fecha ? new Date(dto.fecha) : undefined },
    });
  }

  /** Baja lógica: nunca se borra físicamente */
  async baja(id: number) {
    await this.findOne(id);
    return this.prisma.registro.update({ where: { id }, data: { activo: false } });
  }

  async stats() {
    const [total, activos, porCategoria, suma] = await Promise.all([
      this.prisma.registro.count(),
      this.prisma.registro.count({ where: { activo: true } }),
      this.prisma.registro.groupBy({ by: ['categoria'], _count: { _all: true }, where: { activo: true } }),
      this.prisma.registro.aggregate({ _sum: { monto: true }, where: { activo: true } }),
    ]);
    return {
      total,
      activos,
      inactivos: total - activos,
      montoTotal: Number(suma._sum.monto ?? 0),
      porCategoria: porCategoria.map((c) => ({ categoria: c.categoria, cantidad: c._count._all })),
    };
  }
}
