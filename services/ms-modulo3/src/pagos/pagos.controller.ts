import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreatePagoDto } from './dto/create-pago.dto';
import { PagosService } from './pagos.service';

@ApiTags('pagos')
@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}

  @Post()
  @ApiOperation({ summary: 'Paga una deuda debitando la cuenta del cliente (ms-modulo2)' })
  pagar(@Body() dto: CreatePagoDto) {
    return this.service.pagar(dto);
  }

  // /stats va antes de /:id para que no lo capture ParseIntPipe
  @Get('stats')
  @ApiOperation({ summary: 'KPIs: total de pagos, monto total y pagos por categoría' })
  stats() {
    return this.service.stats();
  }

  @Get()
  @ApiOperation({ summary: 'Historial de pagos (con proveedor y periodo)' })
  @ApiQuery({ name: 'clienteId', required: false, example: 1 })
  @ApiQuery({ name: 'estado', required: false, example: 'COMPLETADO' })
  findAll(@Query('clienteId') clienteId?: string, @Query('estado') estado?: string) {
    return this.service.findAll(clienteId ? Number(clienteId) : undefined, estado);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un pago (comprobante)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
