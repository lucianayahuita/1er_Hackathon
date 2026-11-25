import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EstadoPrestamo, Prisma } from '@prisma/client';
import { Modulo1Client } from '../integracion/modulo1.client';
import { Modulo2Client } from '../integracion/modulo2.client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { UpdatePrestamoDto } from './dto/update-prestamo.dto';
import type { Actor } from './acceso.guard';

@Injectable()
export class PrestamosService {
  constructor(private readonly prisma: PrismaService, private readonly modulo1: Modulo1Client, private readonly modulo2: Modulo2Client) {}

  findAll(actor: Actor, clienteId?: string) {
    const id = clienteId === undefined ? undefined : Number(clienteId);
    if (clienteId !== undefined && (!Number.isInteger(id) || id! < 1)) throw new BadRequestException('clienteId debe ser un entero positivo');
    if (actor.rol === 'CLIENTE' && id !== undefined && id !== actor.id) throw new ForbiddenException('Solo puedes consultar tus préstamos');
    const propietario = actor.rol === 'CLIENTE' ? actor.id : id;
    return this.prisma.prestamo.findMany({ where: { activo: true, ...(propietario ? { clienteId: propietario } : {}) }, orderBy: { fecha: 'desc' } });
  }

  async findOne(id: number, actor: Actor) {
    const prestamo = await this.prisma.prestamo.findUnique({ where: { id } });
    if (!prestamo) throw new NotFoundException(`Préstamo ${id} no existe`);
    this.validarPropietario(actor, prestamo.clienteId);
    return prestamo;
  }

  async create(dto: CreatePrestamoDto, actor: Actor) {
    this.validarPropietario(actor, dto.clienteId);
    await this.modulo1.obtenerClienteActivo(dto.clienteId);
    await this.modulo2.validarCuenta(dto.clienteId, dto.cuentaDesembolsoId);
    const tasaAnual = dto.tasaAnual ?? 12;
    return this.prisma.prestamo.create({ data: {
      ...dto, tasaAnual, cuotaMensual: this.cuota(dto.monto, tasaAnual, dto.plazoMeses),
    } });
  }

  async update(id: number, dto: UpdatePrestamoDto, actor: Actor) {
    const prestamo = await this.findOne(id, actor);
    if (!prestamo.activo || prestamo.estado !== EstadoPrestamo.SOLICITADO) throw new BadRequestException('Solo se pueden editar préstamos solicitados y activos');
    const cuentaId = dto.cuentaDesembolsoId ?? prestamo.cuentaDesembolsoId;
    await this.modulo2.validarCuenta(prestamo.clienteId, cuentaId);
    const monto = dto.monto ?? Number(prestamo.monto);
    const tasa = dto.tasaAnual ?? Number(prestamo.tasaAnual);
    const plazo = dto.plazoMeses ?? prestamo.plazoMeses;
    await this.cambiarSiVigente(prestamo, { ...dto, cuotaMensual: this.cuota(monto, tasa, plazo) });
    return this.findOne(id, actor);
  }

  async baja(id: number, actor: Actor) {
    const prestamo = await this.findOne(id, actor);
    if (prestamo.estado === EstadoPrestamo.APROBADO || prestamo.estado === EstadoPrestamo.DESEMBOLSADO) throw new BadRequestException('No se puede dar de baja un préstamo con desembolso iniciado');
    await this.cambiarSiVigente(prestamo, { activo: false });
    return this.findOne(id, actor);
  }

  async aprobar(id: number, actor: Actor) {
    this.validarAdmin(actor);
    const prestamo = await this.findOne(id, actor);
    if (prestamo.estado === EstadoPrestamo.DESEMBOLSADO) return prestamo;
    if (prestamo.estado === EstadoPrestamo.APROBADO) throw new ConflictException('El desembolso está en curso o pendiente de conciliación; no se repetirá el depósito');
    if (!prestamo.activo || prestamo.estado !== EstadoPrestamo.SOLICITADO) throw new BadRequestException('Solo se puede aprobar un préstamo solicitado y activo');
    await this.modulo1.obtenerClienteActivo(prestamo.clienteId);
    await this.modulo2.validarCuenta(prestamo.clienteId, prestamo.cuentaDesembolsoId);
    // Reserva durable y atómica ANTES de hacer HTTP. Solo una solicitud puede ganar.
    await this.cambiarSiVigente(prestamo, { estado: EstadoPrestamo.APROBADO });
    try {
      await this.modulo2.depositar(prestamo.cuentaDesembolsoId, Number(prestamo.monto), `Desembolso préstamo #${id}`);
      const finalizado = await this.prisma.prestamo.updateMany({
        where: { id, estado: EstadoPrestamo.APROBADO, activo: true },
        data: { estado: EstadoPrestamo.DESEMBOLSADO },
      });
      if (finalizado.count !== 1) throw new Error('No se pudo confirmar el estado del desembolso');
      return await this.findOne(id, actor);
    } catch {
      // Cuentas no ofrece idempotencia: no volver a SOLICITADO ni repetir el HTTP.
      throw new ServiceUnavailableException('Desembolso pendiente de conciliación con Cuentas; no vuelva a depositar ni restablezca el préstamo sin verificar el movimiento');
    }
  }

  async rechazar(id: number, actor: Actor) {
    this.validarAdmin(actor);
    const prestamo = await this.findOne(id, actor);
    if (!prestamo.activo || prestamo.estado !== EstadoPrestamo.SOLICITADO) throw new BadRequestException('Solo se puede rechazar un préstamo solicitado y activo');
    await this.cambiarSiVigente(prestamo, { estado: EstadoPrestamo.RECHAZADO });
    return this.findOne(id, actor);
  }

  async stats(actor: Actor) {
    this.validarAdmin(actor);
    const [total, monto, estados] = await Promise.all([
      this.prisma.prestamo.count(),
      this.prisma.prestamo.aggregate({ _sum: { monto: true }, where: { estado: EstadoPrestamo.DESEMBOLSADO, activo: true } }),
      this.prisma.prestamo.groupBy({ by: ['estado'], _count: { _all: true } }),
    ]);
    return { total, montoDesembolsado: Number(monto._sum.monto ?? 0), porEstado: Object.fromEntries(estados.map((e) => [e.estado, e._count._all])) };
  }

  private validarPropietario(actor: Actor, clienteId: number) {
    if (actor.rol !== 'ADMIN' && actor.id !== clienteId) throw new ForbiddenException('Solo puedes operar sobre tus préstamos');
  }

  private validarAdmin(actor: Actor) {
    if (actor.rol !== 'ADMIN') throw new ForbiddenException('Solo un administrador puede realizar esta operación');
  }

  private async cambiarSiVigente(prestamo: Prisma.PrestamoGetPayload<{}>, data: Prisma.PrestamoUpdateManyMutationInput) {
    // Comparar estado y todos los datos financieros evita aprobar una versión editada
    // mientras se validaban el cliente y la cuenta, incluso dentro del mismo milisegundo.
    const resultado = await this.prisma.prestamo.updateMany({ where: {
      id: prestamo.id, estado: prestamo.estado, activo: prestamo.activo, updatedAt: prestamo.updatedAt,
      monto: prestamo.monto, tasaAnual: prestamo.tasaAnual, plazoMeses: prestamo.plazoMeses,
      cuentaDesembolsoId: prestamo.cuentaDesembolsoId,
    }, data });
    if (resultado.count !== 1) throw new ConflictException('El préstamo cambió durante la operación; vuelva a consultarlo');
  }

  private cuota(monto: number, tasaAnual: number, plazoMeses: number): Prisma.Decimal {
    const i = tasaAnual / 12 / 100;
    const cuota = i === 0 ? monto / plazoMeses : monto * i / (1 - Math.pow(1 + i, -plazoMeses));
    return new Prisma.Decimal((Math.round((cuota + Number.EPSILON) * 100) / 100).toFixed(2));
  }
}
