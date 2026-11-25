import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

interface Cliente { id: number; activo: boolean }

@Injectable()
export class Modulo1Client {
  private readonly baseUrl = process.env.MS_MODULO1_URL ?? 'http://localhost:3001';
  private readonly serviceKey = process.env.INTERNAL_API_KEY;

  async obtenerClienteActivo(id: number): Promise<Cliente> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/clientes/${id}`, {
        headers: this.serviceKey ? { 'X-Service-Key': this.serviceKey } : {},
        signal: AbortSignal.timeout(1500),
      });
    } catch {
      throw new ServiceUnavailableException('ms-modulo1 no está disponible');
    }
    if (res.status === 404) throw new BadRequestException('El cliente no existe o está inactivo');
    if (res.status === 401 || res.status === 403) throw new ServiceUnavailableException('No se pudo autorizar la consulta a ms-modulo1');
    if (!res.ok) throw new ServiceUnavailableException(`ms-modulo1 respondió ${res.status}`);
    let cliente: Cliente;
    try { cliente = await res.json() as Cliente; }
    catch { throw new ServiceUnavailableException('ms-modulo1 devolvió una respuesta inválida'); }
    if (!cliente || cliente.id !== id || typeof cliente.activo !== 'boolean') throw new ServiceUnavailableException('ms-modulo1 devolvió una respuesta inválida');
    if (!cliente.activo) throw new BadRequestException('El cliente no existe o está inactivo');
    return cliente;
  }

  async autenticar(id: number, authorization: string): Promise<{ id: number; rol: 'ADMIN' | 'CLIENTE' }> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/clientes/${id}`, {
        headers: { Authorization: authorization }, signal: AbortSignal.timeout(1500),
      });
    } catch {
      throw new ServiceUnavailableException('ms-modulo1 no está disponible para validar el acceso');
    }
    if (res.status === 401 || res.status === 404) throw new UnauthorizedException('Token inválido o expirado');
    if (res.status === 403) throw new ForbiddenException('Cliente bloqueado, inactivo o sin permiso');
    if (!res.ok) throw new ServiceUnavailableException('No se pudo validar el acceso con ms-modulo1');
    let cliente;
    try { cliente = await res.json(); }
    catch { throw new ServiceUnavailableException('ms-modulo1 devolvió una respuesta inválida'); }
    if (!cliente || cliente.id !== id || !cliente.activo || cliente.bloqueado || !['ADMIN', 'CLIENTE'].includes(cliente.rol)) {
      throw new ForbiddenException('Cliente bloqueado, inactivo o sin permiso');
    }
    return { id: cliente.id, rol: cliente.rol };
  }
}
