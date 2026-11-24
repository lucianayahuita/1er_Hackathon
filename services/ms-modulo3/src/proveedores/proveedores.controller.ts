import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProveedoresService } from './proveedores.service';

@ApiTags('proveedores')
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de proveedores de servicios' })
  @ApiQuery({ name: 'categoria', required: false, example: 'LUZ' })
  findAll(@Query('categoria') categoria?: string) {
    return this.service.findAll(categoria);
  }

  @Get(':id/deudas')
  @ApiOperation({ summary: 'Deudas pendientes del cliente en el proveedor simulado' })
  @ApiQuery({ name: 'codigoCliente', required: false, example: 'MED-10001' })
  deudas(
    @Param('id', ParseIntPipe) id: number,
    @Query('codigoCliente') codigoCliente?: string,
  ) {
    return this.service.deudasPendientes(id, codigoCliente);
  }
}
