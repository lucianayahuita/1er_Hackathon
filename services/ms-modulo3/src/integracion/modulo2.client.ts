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
 * MOCK_MODULO2=true simula Cuentas mientras ms-modulo2 no esté listo.
 */
@Injectable()
export class Modulo2Client {
  private readonly logger = new Logger(Modulo2Client.name);
  private readonly baseUrl = process.env.MS_MODULO2_URL ?? 'http://localhost:3002';
  private readonly mock = process.env.MOCK_MODULO2 === 'true';
  private readonly timeoutMs = Number(process.env.MS_TIMEOUT_MS ?? 5000);

  async obtenerCuenta(id: number, clienteIdMock?: number): Promise<CuentaM2 | null> {
    if (this.mock) {
      return {
        id,
        numero: String(1000000000 + id),
        clienteId: clienteIdMock ?? 1,
        moneda: 'BOB',
        saldo: 99999,
        activo: true,
      };
    }

    const res = await this.request(`/cuentas/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new ServiceUnavailableException(`ms-modulo2 respondió ${res.status}`);
    return res.json();
  }

  async extraer(id: number, monto: number, descripcion: string) {
    if (this.mock) return { mock: true, cuentaId: id, monto, descripcion };
    return this.post(`/cuentas/${id}/extraer`, { monto, descripcion });
  }

  /** Usado como compensación (reverso). */
  async depositar(id: number, monto: number, descripcion: string) {
    if (this.mock) return { mock: true, cuentaId: id, monto, descripcion };
    return this.post(`/cuentas/${id}/depositar`, { monto, descripcion });
  }

  private async post(path: string, body: unknown) {
    const res = await this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const responseText = await res.text();
    let data: unknown = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }
    }

    if (!res.ok) {
      if (res.status >= 500) throw new ServiceUnavailableException(`ms-modulo2 respondió ${res.status}`);
      const responseMessage =
        typeof data === 'object' && data !== null && 'message' in data ? data.message : undefined;
      const msg = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : typeof responseMessage === 'string'
          ? responseMessage
          : typeof data === 'string'
            ? data
            : undefined;
      throw new BadRequestException(msg || 'Cuentas rechazó la operación');
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
      throw new ServiceUnavailableException('El servicio de Cuentas no está disponible, intente más tarde');
    }
  }
}
