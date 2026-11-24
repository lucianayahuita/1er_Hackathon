import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Modulo1Client } from './modulo1.client';

@ApiTags('integracion')
@Controller('integracion')
export class IntegracionController {
  constructor(private readonly modulo1: Modulo1Client) {}

  /** Ejemplo: consulta un registro de ms-modulo1 desde este servicio */
  @Get('modulo1/:id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.modulo1.obtenerRegistro(id);
  }
}
