import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Modulo2Client } from '../integracion/modulo2.client';
import { CreatePagoDto } from './dto/create-pago.dto';

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modulo2: Modulo2Client,
  ) {}

  async pagar(dto: CreatePagoDto) {
    const deuda = await this.prisma.deuda.findUnique({
      where: { id: dto.deudaId },
      include: { proveedor: true },
    });
    if (!deuda || deuda.pagada) {
      throw new BadRequestException('La deuda no existe o ya fue pagada');
    }

    const cuenta = await this.modulo2.obtenerCuenta(dto.cuentaId, dto.clienteId);
    if (!cuenta) {
      throw new BadRequestException('La cuenta no existe');
    }
    if (!cuenta.activo || Number(cuenta.clienteId) !== dto.clienteId) {
      await this.crearPagoConComprobante({
        clienteId: dto.clienteId,
        cuentaId: dto.cuentaId,
        deudaId: deuda.id,
        monto: deuda.monto,
        estado: 'RECHAZADO',
        motivo: 'La cuenta no pertenece al cliente',
      });
      throw new BadRequestException('La cuenta no pertenece al cliente');
    }

    const monto = Number(deuda.monto);
    const descripcion = `Pago ${deuda.proveedor.nombre} ${deuda.periodo}`;
    try {
      await this.modulo2.extraer(dto.cuentaId, monto, descripcion);
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;

      await this.crearPagoConComprobante({
        clienteId: dto.clienteId,
        cuentaId: dto.cuentaId,
        deudaId: deuda.id,
        monto: deuda.monto,
        estado: 'RECHAZADO',
        motivo: error.message,
      });
      throw error;
    }

    try {
      return await this.guardarPagoCompletado(dto, deuda.id, deuda.monto);
    } catch (error) {
      this.logger.error(`Fallo al registrar pago de deuda ${deuda.id}; revirtiendo débito`);
      try {
        await this.modulo2.depositar(dto.cuentaId, monto, `Reverso de ${descripcion}`);
      } catch (reversalError) {
        const detail = reversalError instanceof Error ? reversalError.message : String(reversalError);
        this.logger.error(`No se pudo revertir el débito: ${detail}`);
        throw new ServiceUnavailableException(
          'No se pudo registrar el pago ni confirmar el reverso del débito; requiere conciliación',
        );
      }
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'No se pudo registrar el pago después de revertir el débito',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('No se pudo registrar el pago; el débito fue revertido');
    }
  }

  findAll(clienteId?: number, estado?: string) {
    return this.prisma.pago.findMany({
      where: {
        ...(clienteId !== undefined ? { clienteId } : {}),
        ...(estado ? { estado: estado.toUpperCase() } : {}),
      },
      include: { deuda: { include: { proveedor: true } } },
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: number) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      include: { deuda: { include: { proveedor: true } } },
    });
    if (!pago) throw new NotFoundException(`Pago ${id} no existe`);
    return pago;
  }

  async stats() {
    const pagos = await this.prisma.pago.findMany({
      where: { estado: 'COMPLETADO' },
      include: { deuda: { include: { proveedor: { select: { categoria: true } } } } },
    });

    const rechazados = await this.prisma.pago.count({ where: { estado: 'RECHAZADO' } });
    const categorias = new Map<string, number>();
    let montoTotal = 0;
    for (const pago of pagos) {
      montoTotal += Number(pago.monto);
      const categoria = pago.deuda.proveedor.categoria;
      categorias.set(categoria, (categorias.get(categoria) ?? 0) + 1);
    }

    return {
      totalPagos: pagos.length,
      montoTotal: Number(montoTotal.toFixed(2)),
      rechazados,
      porCategoria: [...categorias.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([categoria, cantidad]) => ({ categoria, cantidad })),
    };
  }

  private async crearPagoConComprobante(
    data: {
      clienteId: number;
      cuentaId: number;
      deudaId: number;
      monto: Prisma.Decimal;
      estado: string;
      motivo?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const fecha = new Date();
    const prefijo = `PAG-${fecha.toISOString().slice(0, 10).replace(/-/g, '')}-`;
    const intentos = tx ? 1 : 3;

    for (let intento = 0; intento < intentos; intento += 1) {
      const cantidad = await db.pago.count({
        where: { comprobante: { startsWith: prefijo } },
      });
      const comprobante = `${prefijo}${String(cantidad + 1).padStart(4, '0')}`;

      try {
        return await db.pago.create({
          data: { ...data, comprobante },
          include: { deuda: { include: { proveedor: true } } },
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError)
          || error.code !== 'P2002'
          || intento === intentos - 1
        ) {
          throw error;
        }
      }
    }

    throw new Error('No se pudo generar un comprobante único');
  }

  private async guardarPagoCompletado(
    dto: CreatePagoDto,
    deudaId: number,
    monto: Prisma.Decimal,
  ) {
    for (let intento = 0; intento < 3; intento += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const actualizada = await tx.deuda.updateMany({
            where: { id: deudaId, pagada: false },
            data: { pagada: true },
          });
          if (actualizada.count !== 1) {
            throw new BadRequestException('La deuda no existe o ya fue pagada');
          }

          return this.crearPagoConComprobante({
            clienteId: dto.clienteId,
            cuentaId: dto.cuentaId,
            deudaId,
            monto,
            estado: 'COMPLETADO',
          }, tx);
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError)
          || error.code !== 'P2002'
          || intento === 2
        ) {
          throw error;
        }
      }
    }

    throw new Error('No se pudo guardar el pago completado');
  }
}
