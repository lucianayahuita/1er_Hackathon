import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Modulo2Client } from './modulo2.client';

@ApiTags('integracion')
@Controller('integracion')
export class IntegracionController {
  constructor(private readonly modulo2: Modulo2Client) {}

  @Get('cuentas/:id')
  @ApiOperation({ summary: 'Prueba de integración: consulta una cuenta en ms-modulo2' })
  async cuenta(@Param('id', ParseIntPipe) id: number) {
    const cuenta = await this.modulo2.obtenerCuenta(id);
    if (!cuenta) throw new NotFoundException(`La cuenta ${id} no existe en ms-modulo2`);
    return cuenta;
  }
}
