import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

interface Cuenta { id: number; clienteId: number; activo: boolean }

@Injectable()
export class Modulo2Client {
  private readonly baseUrl = process.env.MS_MODULO2_URL ?? 'http://localhost:3002';

  async validarCuenta(clienteId: number, cuentaId: number): Promise<Cuenta> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/cuentas/${cuentaId}`, { signal: AbortSignal.timeout(1500) });
    } catch {
      throw new ServiceUnavailableException('ms-modulo2 no está disponible');
    }
    if (res.status === 404) throw new BadRequestException('La cuenta no existe');
    if (!res.ok) throw new ServiceUnavailableException(`ms-modulo2 respondió ${res.status}`);
    let cuenta: Cuenta;
    try { cuenta = await res.json() as Cuenta; }
    catch { throw new ServiceUnavailableException('ms-modulo2 devolvió una respuesta inválida'); }
    if (!cuenta || cuenta.id !== cuentaId || typeof cuenta.activo !== 'boolean') throw new ServiceUnavailableException('ms-modulo2 devolvió una respuesta inválida');
    if (!cuenta.activo || cuenta.clienteId !== clienteId) {
      throw new BadRequestException('La cuenta debe estar activa y pertenecer al cliente');
    }
    return cuenta;
  }

  async depositar(cuentaId: number, monto: number, descripcion: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/cuentas/${cuentaId}/depositar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto, descripcion }),
        signal: AbortSignal.timeout(1500),
      });
    } catch {
      throw new ServiceUnavailableException('No se pudo conectar con ms-modulo2 para desembolsar');
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(`No se pudo confirmar el desembolso en ms-modulo2 (${res.status})`);
    }
  }
}
