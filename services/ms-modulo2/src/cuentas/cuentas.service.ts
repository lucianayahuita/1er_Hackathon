import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoMovimiento } from '@prisma/client';
import { Modulo1Client } from '../integracion/modulo1.client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCuentaDto } from './dto/create-cuenta.dto';
import { OperacionDto } from './dto/operacion.dto';
import { UpdateCuentaDto } from './dto/update-cuenta.dto';

@Injectable()
export class CuentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modulo1: Modulo1Client,
  ) {}

  findAll(clienteId?: string, activo?: string) {
    const cliente = clienteId === undefined ? undefined : Number(clienteId);
    if (clienteId !== undefined && (!Number.isInteger(cliente) || cliente! < 1)) {
      throw new BadRequestException('El clienteId debe ser un entero positivo');
    }
    if (activo !== undefined && activo !== 'true' && activo !== 'false') {
      throw new BadRequestException('El filtro activo debe ser true o false');
    }
    return this.prisma.cuenta.findMany({
      where: {
        ...(cliente !== undefined ? { clienteId: cliente } : {}),
        ...(activo !== undefined ? { activo: activo === 'true' } : {}),
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const cuenta = await this.prisma.cuenta.findUnique({ where: { id } });
    if (!cuenta) throw new NotFoundException(`Cuenta ${id} no existe`);
    return cuenta;
  }

  async findByNumero(numero: string) {
    const cuenta = await this.prisma.cuenta.findUnique({ where: { numero } });
    if (!cuenta) throw new NotFoundException(`La cuenta ${numero} no existe`);
    return cuenta;
  }

  async create(dto: CreateCuentaDto) {
    await this.modulo1.obtenerClienteActivo(dto.clienteId);
    return this.prisma.$transaction(async (tx) => {
      const cuenta = await tx.cuenta.create({
        data: { numero: `TEMP-${crypto.randomUUID()}`, clienteId: dto.clienteId, moneda: dto.moneda },
      });
      return tx.cuenta.update({
        where: { id: cuenta.id },
        data: { numero: String(1000000000 + cuenta.id) },
      });
    });
  }

  async update(id: number, dto: UpdateCuentaDto) {
    await this.findOne(id);
    return this.prisma.cuenta.update({ where: { id }, data: dto });
  }

  async baja(id: number) {
    const cuenta = await this.findOne(id);
    if (!cuenta.saldo.isZero()) {
      throw new BadRequestException('La cuenta debe tener saldo 0 para darse de baja');
    }
    return this.prisma.cuenta.update({ where: { id }, data: { activo: false } });
  }

  depositar(id: number, dto: OperacionDto) {
    return this.operar(id, dto, 'DEPOSITO');
  }

  extraer(id: number, dto: OperacionDto) {
    return this.operar(id, dto, 'RETIRO');
  }

  private async operar(id: number, dto: OperacionDto, tipo: TipoMovimiento) {
    const monto = new Prisma.Decimal(dto.monto);
    if (monto.lessThanOrEqualTo(0)) throw new BadRequestException('El monto debe ser mayor a 0');

    return this.prisma.$transaction(async (tx) => {
      const cuenta = await tx.cuenta.findUnique({ where: { id } });
      if (!cuenta) throw new NotFoundException(`Cuenta ${id} no existe`);
      if (!cuenta.activo) throw new BadRequestException('La cuenta está inactiva');
      if (tipo === 'RETIRO' && monto.greaterThan(cuenta.saldo)) {
        throw new BadRequestException('Saldo insuficiente');
      }

      const saldoResultante = tipo === 'DEPOSITO' ? cuenta.saldo.plus(monto) : cuenta.saldo.minus(monto);
      const actualizada = await tx.cuenta.update({
        where: { id },
        data: { saldo: saldoResultante },
      });
      const movimiento = await tx.movimiento.create({
        data: {
          cuentaId: id,
          tipo,
          monto,
          saldoResultante,
          descripcion: dto.descripcion,
        },
      });
      return { cuenta: actualizada, movimiento };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async movimientos(id: number) {
    await this.findOne(id);
    return this.prisma.movimiento.findMany({ where: { cuentaId: id }, orderBy: { fecha: 'desc' } });
  }

  async stats() {
    const [totalCuentas, activas, saldo] = await Promise.all([
      this.prisma.cuenta.count(),
      this.prisma.cuenta.count({ where: { activo: true } }),
      this.prisma.cuenta.aggregate({ _sum: { saldo: true } }),
    ]);
    return { totalCuentas, activas, saldoTotal: Number(saldo._sum.saldo ?? 0) };
  }
}
