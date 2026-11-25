import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(categoria?: string) {
    return this.prisma.proveedor.findMany({
      where: { activo: true, ...(categoria ? { categoria: categoria.trim().toUpperCase() } : {}) },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });
  }

  async deudasPendientes(proveedorId: number, codigoCliente?: string) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id: proveedorId, activo: true },
    });
    if (!proveedor) throw new NotFoundException(`El proveedor ${proveedorId} no existe`);

    return this.prisma.deuda.findMany({
      where: {
        proveedorId,
        pagada: false,
        ...(codigoCliente ? { codigoCliente: codigoCliente.trim().toUpperCase() } : {}),
      },
      include: { proveedor: true },
      orderBy: [{ codigoCliente: 'asc' }, { periodo: 'asc' }],
    });
  }
}
