import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CuentasService } from './cuentas.service';
import { CreateCuentaDto } from './dto/create-cuenta.dto';
import { OperacionDto } from './dto/operacion.dto';
import { UpdateCuentaDto } from './dto/update-cuenta.dto';

@ApiTags('cuentas')
@Controller('cuentas')
export class CuentasController {
  constructor(private readonly service: CuentasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cuentas' })
  @ApiQuery({ name: 'clienteId', required: false, type: Number })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  findAll(@Query('clienteId') clienteId?: string, @Query('activo') activo?: string) {
    return this.service.findAll(clienteId, activo);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de cuentas' })
  stats() {
    return this.service.stats();
  }

  @Get('numero/:numero')
  @ApiOperation({ summary: 'Buscar una cuenta por número' })
  findByNumero(@Param('numero') numero: string) {
    return this.service.findByNumero(numero);
  }

  @Get(':id/movimientos')
  @ApiOperation({ summary: 'Consultar el historial de movimientos' })
  movimientos(@Param('id', ParseIntPipe) id: number) {
    return this.service.movimientos(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una cuenta y su saldo' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una cuenta para un cliente activo' })
  create(@Body() dto: CreateCuentaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar la moneda de una cuenta' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCuentaDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja una cuenta con saldo cero' })
  baja(@Param('id', ParseIntPipe) id: number) {
    return this.service.baja(id);
  }

  @Post(':id/depositar')
  @ApiOperation({ summary: 'Depositar fondos' })
  depositar(@Param('id', ParseIntPipe) id: number, @Body() dto: OperacionDto) {
    return this.service.depositar(id, dto);
  }

  @Post(':id/extraer')
  @ApiOperation({ summary: 'Retirar fondos' })
  extraer(@Param('id', ParseIntPipe) id: number, @Body() dto: OperacionDto) {
    return this.service.extraer(id, dto);
  }
}
