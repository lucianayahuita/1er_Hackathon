import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { TransferenciasService } from './transferencias.service';

@ApiTags('transferencias')
@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly service: TransferenciasService) {}

  @Post()
  @ApiOperation({ summary: 'Realizar una transferencia (propia, tercero o interbancaria)' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Clave opcional para evitar duplicados' })
  @ApiResponse({ status: 201, description: 'Transferencia completada' })
  @ApiResponse({ status: 400, description: 'Error de validación o regla de negocio' })
  @ApiResponse({ status: 409, description: 'Transferencia duplicada' })
  @ApiResponse({ status: 503, description: 'Servicio de Cuentas (ms-modulo2) no disponible' })
  create(
    @Body() dto: CreateTransferenciaDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.create(dto, idempotencyKey);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de transferencias completadas' })
  stats() {
    return this.service.stats();
  }

  @Get()
  @ApiOperation({ summary: 'Listar historial de transferencias' })
  @ApiQuery({ name: 'clienteId', required: false, type: Number })
  findAll(@Query('clienteId') clienteId?: string) {
    return this.service.findAll(clienteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar comprobante de una transferencia por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
