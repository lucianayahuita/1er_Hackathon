import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Modulo1Client } from '../integracion/modulo1.client';

export interface Actor { id: number; rol: 'ADMIN' | 'CLIENTE' }
export const SoloAdmin = () => SetMetadata('prestamos:admin', true);

@Injectable()
export class AccesoGuard implements CanActivate {
  constructor(private readonly modulo1: Modulo1Client, private readonly reflector: Reflector) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest();
    const cabecera = peticion.headers.authorization;
    const token = typeof cabecera === 'string' ? /^Bearer ([^\s]+)$/i.exec(cabecera)?.[1] : undefined;
    if (!token) throw new UnauthorizedException('Se requiere un token Bearer');
    let id: number;
    try {
      const partes = token.split('.');
      if (partes.length !== 3) throw new Error('Formato inválido');
      id = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8')).sub;
      if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw new Error('ID inválido');
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    // El sub decodificado NO autentica: Clientes verifica firma, expiración y estado.
    // No enviar X-Service-Key aquí, porque omitiría la verificación del JWT en Clientes.
    const actor = await this.modulo1.autenticar(id, cabecera);
    if (this.reflector.getAllAndOverride<boolean>('prestamos:admin', [contexto.getHandler(), contexto.getClass()]) && actor.rol !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede realizar esta operación');
    }
    peticion.actor = actor;
    return true;
  }
}
