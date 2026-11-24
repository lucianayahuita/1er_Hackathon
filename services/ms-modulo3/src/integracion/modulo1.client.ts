import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

/**
 * Cliente HTTP hacia ms-modulo1 (entidad central).
 * Comunicación síncrona REST entre microservicios.
 */
@Injectable()
export class Modulo1Client {
  private readonly baseUrl = process.env.MS_MODULO1_URL ?? 'http://localhost:3001';

  async obtenerRegistro(id: number) {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/registros/${id}`);
    } catch {
      throw new ServiceUnavailableException('ms-modulo1 no está disponible');
    }
    if (res.status === 404) throw new NotFoundException(`Registro ${id} no existe en ms-modulo1`);
    if (!res.ok) throw new ServiceUnavailableException(`ms-modulo1 respondió ${res.status}`);
    return res.json();
  }
}
