import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { LoginClienteDto } from './dto/login-cliente.dto';
import { hashearPassword, verificarPassword } from './password';
import { vigenciaToken } from './jwt.config';

// Lista explícita: ninguna respuesta pública incluye passwordHash.
const clientePublico = {
  id: true, ci: true, nombres: true, apellidos: true, email: true,
  telefono: true, direccion: true, usuario: true, intentosFallidos: true,
  bloqueado: true, activo: true, rol: true, createdAt: true, updatedAt: true,
} satisfies Prisma.ClienteSelect;

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  findAll(q?: string, activo?: boolean) {
    const busqueda = q?.trim();
    return this.prisma.cliente.findMany({
      where: {
        ...(activo !== undefined ? { activo } : {}),
        ...(busqueda ? { OR: [
          { ci: { contains: busqueda, mode: 'insensitive' } },
          { nombres: { contains: busqueda, mode: 'insensitive' } },
          { apellidos: { contains: busqueda, mode: 'insensitive' } },
        ] } : {}),
      },
      select: clientePublico,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id }, select: clientePublico });
    if (!cliente) throw new NotFoundException(`Cliente ${id} no existe`);
    return cliente;
  }

  async create({ password, ...datos }: CreateClienteDto) {
    try {
      return await this.prisma.cliente.create({
        data: { ...datos, passwordHash: hashearPassword(password) }, select: clientePublico,
      });
    } catch (error) { this.traducirError(error); }
  }

  async update(id: number, dto: UpdateClienteDto) {
    try {
      return await this.prisma.cliente.update({ where: { id }, data: dto, select: clientePublico });
    } catch (error) { this.traducirError(error, id); }
  }

  baja(id: number) { return this.cambiarEstado(id, { activo: false }); }

  desbloquear(id: number) { return this.cambiarEstado(id, { bloqueado: false, intentosFallidos: 0 }); }

  private async cambiarEstado(id: number, data: Prisma.ClienteUpdateInput) {
    try {
      return await this.prisma.cliente.update({ where: { id }, data, select: clientePublico });
    } catch (error) { this.traducirError(error, id); }
  }

  async login(dto: LoginClienteDto) {
    const resultado = await this.prisma.$transaction(async (tx) => {
      // Serializar intentos del mismo cliente evita perder incrementos concurrentes.
      await tx.$queryRaw`SELECT "id" FROM "Cliente" WHERE "usuario" = ${dto.usuario} FOR UPDATE`;
      const cliente = await tx.cliente.findUnique({ where: { usuario: dto.usuario } });
      if (!cliente) return { error: 'credenciales' } as const;
      if (!cliente.activo) return { error: 'inactivo' } as const;
      if (cliente.bloqueado) return { error: 'bloqueado' } as const;

      if (!verificarPassword(dto.password, cliente.passwordHash)) {
        const intentosFallidos = cliente.intentosFallidos + 1;
        const bloqueado = intentosFallidos >= 3;
        await tx.cliente.update({ where: { id: cliente.id }, data: { intentosFallidos, bloqueado } });
        // Lanzar la excepción después del commit conserva el contador.
        return { error: bloqueado ? 'bloqueado' : 'credenciales' } as const;
      }

      await tx.cliente.update({ where: { id: cliente.id }, data: { intentosFallidos: 0 } });
      return { cliente: { id: cliente.id, nombres: cliente.nombres, apellidos: cliente.apellidos, usuario: cliente.usuario, rol: cliente.rol } };
    });

    if (resultado.error === 'inactivo') throw new ForbiddenException('Cliente inactivo');
    if (resultado.error === 'bloqueado') throw new ForbiddenException('Cliente bloqueado');
    if (resultado.error) throw new UnauthorizedException('Credenciales inválidas');
    const cliente = resultado.cliente!;
    return {
      ...cliente,
      access_token: await this.jwt.signAsync({ sub: cliente.id, rol: cliente.rol }),
      token_type: 'Bearer', expires_in: vigenciaToken(),
    };
  }

  async stats() {
    const [total, activos, bloqueados] = await this.prisma.$transaction([
      this.prisma.cliente.count(),
      this.prisma.cliente.count({ where: { activo: true } }),
      this.prisma.cliente.count({ where: { bloqueado: true } }),
    ]);
    return { total, activos, inactivos: total - activos, bloqueados };
  }

  private traducirError(error: unknown, id?: number): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw new NotFoundException(`Cliente ${id} no existe`);
      if (error.code === 'P2002') {
        const campos = String(error.meta?.target ?? '');
        if (campos.includes('ci')) throw new ConflictException('El CI ya está registrado');
        if (campos.includes('email')) throw new ConflictException('El email ya está registrado');
        if (campos.includes('usuario')) throw new ConflictException('El usuario ya existe');
        throw new ConflictException('Los datos del cliente ya están registrados');
      }
    }
    throw error;
  }
}
