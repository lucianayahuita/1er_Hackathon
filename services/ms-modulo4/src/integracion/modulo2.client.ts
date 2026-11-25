import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface CuentaM2 {
  id: number;
  numero: string;
  clienteId: number;
  moneda: string;
  saldo: string | number;
  activo: boolean;
}

/**
 * Cliente HTTP hacia ms-modulo2 (Cuentas de ahorro).
 * Toda validación de existencia, estado, pertenencia y movimiento de saldos
 * se realiza vía API REST contra ms-modulo2.
 */
@Injectable()
export class Modulo2Client {
  private readonly logger = new Logger(Modulo2Client.name);
  private readonly baseUrl = process.env.MS_MODULO2_URL ?? 'http://localhost:3002';
  private readonly timeoutMs = Number(process.env.MS_TIMEOUT_MS ?? 5000);

  async obtenerCuenta(id: number): Promise<CuentaM2 | null> {
    const res = await this.request(`/cuentas/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new ServiceUnavailableException(`ms-modulo2 respondió ${res.status}`);
    return (await res.json()) as CuentaM2;
  }

  async obtenerPorNumero(numero: string): Promise<CuentaM2 | null> {
    const res = await this.request(`/cuentas/numero/${encodeURIComponent(numero)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new ServiceUnavailableException(`ms-modulo2 respondió ${res.status}`);
    return (await res.json()) as CuentaM2;
  }

  async extraer(id: number, monto: number, descripcion: string) {
    return this.post(`/cuentas/${id}/extraer`, { monto, descripcion });
  }

  async depositar(id: number, monto: number, descripcion: string) {
    return this.post(`/cuentas/${id}/depositar`, { monto, descripcion });
  }

  private async post(path: string, body: unknown) {
    const res = await this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      if (res.status >= 500) {
        throw new ServiceUnavailableException(`ms-modulo2 respondió ${res.status}`);
      }
      const rawMessage =
        typeof data === 'object' && data !== null && 'message' in data ? data.message : undefined;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : typeof data === 'string' && data
            ? data
            : 'Cuentas rechazó la operación';
      throw new BadRequestException(message);
    }

    return data;
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`ms-modulo2 no disponible: ${detail}`);
      throw new ServiceUnavailableException('El servicio de Cuentas no está disponible');
    }
  }
}
