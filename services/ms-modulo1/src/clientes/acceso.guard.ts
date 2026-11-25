import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '@prisma/client';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESO, PoliticaAcceso } from './acceso.decorator';

@Injectable()
export class AccesoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const politica = this.reflector.getAllAndOverride<PoliticaAcceso>(ACCESO, [contexto.getHandler(), contexto.getClass()]);
    if (politica === 'publico') return true;
    if (!politica) throw new ForbiddenException('Operación sin permisos definidos');
    const peticion = contexto.switchToHttp().getRequest();

    // La clave interna solo sirve para GET /clientes/:id, nunca para administrar.
    const claveInterna = peticion.headers['x-service-key'];
    if (politica === 'consulta' && claveInterna !== undefined) {
      const esperada = process.env.INTERNAL_API_KEY;
      if (typeof claveInterna !== 'string' || !esperada ||
        Buffer.byteLength(claveInterna) !== Buffer.byteLength(esperada) ||
        !timingSafeEqual(Buffer.from(claveInterna), Buffer.from(esperada))) {
        throw new UnauthorizedException('Clave de servicio inválida');
      }
      return true;
    }

    const autorizacion = peticion.headers.authorization;
    const coincidencia = typeof autorizacion === 'string' ? /^Bearer ([^\s]+)$/i.exec(autorizacion) : null;
    if (!coincidencia) throw new UnauthorizedException('Se requiere un token Bearer');

    let payload: { sub: number; rol: Rol; exp: number; iat: number };
    try {
      payload = await this.jwt.verifyAsync(coincidencia[1]);
      if (!payload || !Number.isInteger(payload.sub) || payload.sub <= 0 ||
        !Number.isInteger(payload.exp) || !Number.isInteger(payload.iat) ||
        payload.exp <= payload.iat || payload.iat > Math.floor(Date.now() / 1000) ||
        ![Rol.ADMIN, Rol.CLIENTE].includes(payload.rol)) {
        throw new Error('Claims inválidos');
      }
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Consultar el estado actual revoca acceso al dar de baja, bloquear o cambiar el rol.
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: payload.sub }, select: { id: true, rol: true, activo: true, bloqueado: true },
    });
    if (!cliente) throw new UnauthorizedException('El cliente del token no existe');
    if (!cliente.activo) throw new ForbiddenException('Cliente inactivo');
    if (cliente.bloqueado) throw new ForbiddenException('Cliente bloqueado');
    peticion.clienteAutenticado = { id: cliente.id, rol: cliente.rol };

    if (cliente.rol === Rol.ADMIN) return true;
    if ((politica === 'propio' || politica === 'consulta') && peticion.params.id === String(cliente.id)) return true;
    throw new ForbiddenException('No tienes permiso para realizar esta operación');
  }
}
