import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { UpdatePrestamoDto } from './dto/update-prestamo.dto';
import { PrestamosService } from './prestamos.service';
import { AccesoGuard, Actor, SoloAdmin } from './acceso.guard';

type PeticionAutenticada = { actor: Actor };

@ApiTags('préstamos')
@Controller('prestamos')
@UseGuards(AccesoGuard)
@ApiBearerAuth()
export class PrestamosController {
  constructor(private readonly service: PrestamosService) {}

  @Get()
  @ApiQuery({ name: 'clienteId', required: false, type: Number })
  findAll(@Req() req: PeticionAutenticada, @Query('clienteId') clienteId?: string) { return this.service.findAll(req.actor, clienteId); }

  @Get('stats') @SoloAdmin() stats(@Req() req: PeticionAutenticada) { return this.service.stats(req.actor); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number, @Req() req: PeticionAutenticada) { return this.service.findOne(id, req.actor); }
  @Post() create(@Body() dto: CreatePrestamoDto, @Req() req: PeticionAutenticada) { return this.service.create(dto, req.actor); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePrestamoDto, @Req() req: PeticionAutenticada) { return this.service.update(id, dto, req.actor); }
  @Patch(':id/baja') baja(@Param('id', ParseIntPipe) id: number, @Req() req: PeticionAutenticada) { return this.service.baja(id, req.actor); }
  @Patch(':id/aprobar') @SoloAdmin() aprobar(@Param('id', ParseIntPipe) id: number, @Req() req: PeticionAutenticada) { return this.service.aprobar(id, req.actor); }
  @Patch(':id/rechazar') @SoloAdmin() rechazar(@Param('id', ParseIntPipe) id: number, @Req() req: PeticionAutenticada) { return this.service.rechazar(id, req.actor); }
}
