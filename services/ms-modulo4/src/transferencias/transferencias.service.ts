import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, TipoTransferencia } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { CuentaM2, Modulo2Client } from '../integracion/modulo2.client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';

const LIMITE_INTERBANCARIO = new Prisma.Decimal(50000);
const VENTANA_DUPLICADO_MS = 10_000;

@Injectable()
export class TransferenciasService {
  private readonly logger = new Logger(TransferenciasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modulo2: Modulo2Client,
  ) {}

  bancos() {
    return this.prisma.banco.findMany({ orderBy: { id: 'asc' } });
  }

  findAll(clienteId?: string) {
    const cliente = clienteId === undefined ? undefined : Number(clienteId);
    if (clienteId !== undefined && (!Number.isInteger(cliente) || cliente! < 1)) {
      throw new BadRequestException('El clienteId debe ser un entero positivo');
    }
    return this.prisma.transferencia.findMany({
      where: cliente !== undefined ? { clienteId: cliente } : undefined,
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: number) {
    const transferencia = await this.prisma.transferencia.findUnique({ where: { id } });
    if (!transferencia) throw new NotFoundException(`Transferencia ${id} no existe`);
    return transferencia;
  }

  async stats() {
    const [total, suma, agrupado] = await Promise.all([
      this.prisma.transferencia.count({ where: { estado: 'COMPLETADA' } }),
      this.prisma.transferencia.aggregate({
        _sum: { monto: true },
        where: { estado: 'COMPLETADA' },
      }),
      this.prisma.transferencia.groupBy({
        by: ['tipo'],
        _count: { _all: true },
        where: { estado: 'COMPLETADA' },
      }),
    ]);

    return {
      total,
      montoTotal: Number(suma._sum.monto ?? 0),
      porTipo: agrupado.map((item) => ({ tipo: item.tipo, cantidad: item._count._all })),
    };
  }

  async create(dto: CreateTransferenciaDto, idempotencyHeader?: string) {
    const monto = new Prisma.Decimal(dto.monto);
    if (monto.lessThanOrEqualTo(0)) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    const destinoNumero = dto.cuentaDestinoNumero.trim();
    const glosa = dto.glosa.trim();
    const claveIdempotencia = idempotencyHeader?.trim() || dto.claveIdempotencia?.trim() || null;

    await this.verificarNoDuplicada(dto, destinoNumero, glosa, monto, claveIdempotencia);

    const cuentaOrigen = await this.validarCuentaOrigen(dto.cuentaOrigenId, dto.clienteId, destinoNumero);

    let cuentaDestino: CuentaM2 | null = null;
    let bancoNombre: string | null = null;
    let titularDestino: string | null = null;
    let codigoAch: string | null = null;

    if (dto.tipo === 'PROPIA' || dto.tipo === 'TERCERO') {
      cuentaDestino = await this.validarCuentaDestinoInterna(
        dto.tipo,
        dto.clienteId,
        cuentaOrigen,
        destinoNumero,
      );
    } else {
      const validacionInterbancaria = await this.validarInterbancaria(dto, monto);
      bancoNombre = validacionInterbancaria.bancoNombre;
      titularDestino = validacionInterbancaria.titularDestino;
      codigoAch = await this.generarCodigoAchUnico();
    }

    const transferencia = await this.crearPendiente({
      tipo: dto.tipo as TipoTransferencia,
      clienteId: dto.clienteId,
      cuentaOrigenId: dto.cuentaOrigenId,
      cuentaDestinoNumero: destinoNumero,
      bancoDestino: bancoNombre,
      titularDestino,
      monto,
      glosa,
      codigoAch,
      claveIdempotencia,
    });

    const montoNum = Number(monto);
    const descripcionDebito = `Transferencia ${dto.tipo} a ${destinoNumero} - ${glosa}`;

    try {
      await this.modulo2.extraer(cuentaOrigen.id, montoNum, descripcionDebito);
    } catch (error) {
      await this.marcarRechazada(transferencia.id);
      throw error;
    }

    if (cuentaDestino) {
      const descripcionCredito = `Transferencia recibida de ${cuentaOrigen.numero} - ${glosa}`;
      try {
        await this.modulo2.depositar(cuentaDestino.id, montoNum, descripcionCredito);
      } catch (error) {
        await this.compensarDebito(cuentaOrigen.id, montoNum, transferencia.id, error);
      }
    }

    return this.prisma.transferencia.update({
      where: { id: transferencia.id },
      data: { estado: 'COMPLETADA' },
    });
  }

  private async verificarNoDuplicada(
    dto: CreateTransferenciaDto,
    destinoNumero: string,
    glosa: string,
    monto: Prisma.Decimal,
    claveIdempotencia: string | null,
  ) {
    if (claveIdempotencia) {
      const porClave = await this.prisma.transferencia.findUnique({
        where: { claveIdempotencia },
      });
      if (porClave) {
        throw new ConflictException('Transferencia duplicada');
      }
    }

    const desde = new Date(Date.now() - VENTANA_DUPLICADO_MS);
    const reciente = await this.prisma.transferencia.findFirst({
      where: {
        clienteId: dto.clienteId,
        tipo: dto.tipo as TipoTransferencia,
        cuentaOrigenId: dto.cuentaOrigenId,
        cuentaDestinoNumero: destinoNumero,
        monto,
        glosa,
        estado: { in: ['PENDIENTE', 'COMPLETADA'] },
        fecha: { gte: desde },
      },
    });
    if (reciente) {
      throw new ConflictException('Transferencia duplicada: ya se registró una operación idéntica reciente');
    }
  }

  private async validarCuentaOrigen(cuentaOrigenId: number, clienteId: number, destinoNumero: string) {
    const cuentaOrigen = await this.modulo2.obtenerCuenta(cuentaOrigenId);
    if (!cuentaOrigen) {
      throw new BadRequestException('La cuenta origen no existe');
    }
    if (!cuentaOrigen.activo) {
      throw new BadRequestException('La cuenta origen está inactiva');
    }
    if (Number(cuentaOrigen.clienteId) !== clienteId) {
      throw new BadRequestException('La cuenta origen no pertenece al cliente');
    }
    if (cuentaOrigen.numero === destinoNumero) {
      throw new BadRequestException('La cuenta origen y destino no pueden ser la misma');
    }
    return cuentaOrigen;
  }

  private async validarCuentaDestinoInterna(
    tipo: 'PROPIA' | 'TERCERO',
    clienteId: number,
    cuentaOrigen: CuentaM2,
    destinoNumero: string,
  ) {
    const cuentaDestino = await this.modulo2.obtenerPorNumero(destinoNumero);
    if (!cuentaDestino) {
      throw new BadRequestException('La cuenta destino no existe');
    }
    if (!cuentaDestino.activo) {
      throw new BadRequestException('La cuenta destino está inactiva');
    }
    if (cuentaDestino.id === cuentaOrigen.id) {
      throw new BadRequestException('La cuenta origen y destino no pueden ser la misma');
    }
    if (tipo === 'PROPIA' && Number(cuentaDestino.clienteId) !== clienteId) {
      throw new BadRequestException('Para transferencia propia, la cuenta destino debe pertenecer al mismo cliente');
    }
    if (tipo === 'TERCERO' && Number(cuentaDestino.clienteId) === clienteId) {
      throw new BadRequestException('Para transferencia a terceros, la cuenta destino debe pertenecer a otro cliente');
    }
    return cuentaDestino;
  }

  private async validarInterbancaria(dto: CreateTransferenciaDto, monto: Prisma.Decimal) {
    const bancoInput = dto.bancoDestino?.trim();
    const titularDestino = dto.titularDestino?.trim();
    if (!bancoInput || !titularDestino) {
      throw new BadRequestException(
        'bancoDestino y titularDestino son obligatorios para transferencias interbancarias',
      );
    }

    const banco = await this.prisma.banco.findFirst({
      where: {
        OR: [
          { codigo: { equals: bancoInput, mode: 'insensitive' } },
          { nombre: { equals: bancoInput, mode: 'insensitive' } },
        ],
      },
    });
    if (!banco) {
      throw new BadRequestException('El banco destino no es válido');
    }

    if (monto.greaterThan(LIMITE_INTERBANCARIO)) {
      throw new BadRequestException('El monto supera el límite interbancario de Bs 50.000');
    }

    return { bancoNombre: banco.nombre, titularDestino };
  }

  private async generarCodigoAchUnico(): Promise<string> {
    for (let intento = 0; intento < 5; intento++) {
      const codigo = `ACH-${randomInt(100000, 999999)}`;
      const existente = await this.prisma.transferencia.findUnique({ where: { codigoAch: codigo } });
      if (!existente) return codigo;
    }
    return `ACH-${Date.now()}`;
  }

  private async crearPendiente(data: Prisma.TransferenciaCreateInput) {
    try {
      return await this.prisma.transferencia.create({
        data: { ...data, estado: 'PENDIENTE' },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Transferencia duplicada');
      }
      throw error;
    }
  }

  private async marcarRechazada(id: number) {
    await this.prisma.transferencia.update({
      where: { id },
      data: { estado: 'RECHAZADA', claveIdempotencia: null },
    });
  }

  private async compensarDebito(
    cuentaOrigenId: number,
    montoNum: number,
    transferenciaId: number,
    originalError: unknown,
  ): Promise<never> {
    this.logger.warn(`Fallo al acreditar cuenta destino en transferencia ${transferenciaId}; revirtiendo débito`);
    try {
      await this.modulo2.depositar(
        cuentaOrigenId,
        montoNum,
        `Reverso transferencia #${transferenciaId} por fallo en destino`,
      );
      await this.marcarRechazada(transferenciaId);
    } catch (reversalError) {
      const detail = reversalError instanceof Error ? reversalError.message : String(reversalError);
      this.logger.error(`Error crítico al revertir débito en transferencia ${transferenciaId}: ${detail}`);
      await this.marcarRechazada(transferenciaId);
      throw new ServiceUnavailableException(
        'Error al acreditar cuenta destino y no se pudo confirmar el reverso en origen; requiere conciliación',
      );
    }
    throw originalError;
  }
}
