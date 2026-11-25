import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

interface Cliente {
  id: number;
  activo: boolean;
}

/**
 * Cliente HTTP hacia ms-modulo1 (entidad central).
 * Comunicación síncrona REST entre microservicios.
 */
@Injectable()
export class Modulo1Client {
  private readonly baseUrl = process.env.MS_MODULO1_URL ?? 'http://localhost:3001';

  async obtenerClienteActivo(id: number): Promise<Cliente> {
    let res: Response;
    try {
      // ms-modulo1 exige X-Service-Key para consultas entre microservicios (misma INTERNAL_API_KEY en ambos .env)
      res = await fetch(`${this.baseUrl}/clientes/${id}`, {
        headers: { 'X-Service-Key': process.env.INTERNAL_API_KEY ?? '' },
      });
    } catch {
      throw new ServiceUnavailableException('ms-modulo1 no está disponible');
    }
    if (res.status === 404) throw new BadRequestException('El cliente no existe o está inactivo');
    if (res.status === 401) throw new ServiceUnavailableException('Clave de servicio inválida para ms-modulo1');
    if (!res.ok) throw new ServiceUnavailableException(`ms-modulo1 respondió ${res.status}`);
    const cliente = (await res.json()) as Cliente;
    if (!cliente.activo) throw new BadRequestException('El cliente no existe o está inactivo');
    return cliente;
  }
}
