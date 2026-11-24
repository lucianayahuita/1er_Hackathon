import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateRegistroDto } from './dto/create-registro.dto';
import { UpdateRegistroDto } from './dto/update-registro.dto';
import { RegistrosService } from './registros.service';

@ApiTags('registros')
@Controller('registros')
export class RegistrosController {
  constructor(private readonly service: RegistrosService) {}

  @Get()
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  findAll(@Query('q') q?: string, @Query('activo') activo?: string) {
    return this.service.findAll(q, activo === undefined ? undefined : activo === 'true');
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRegistroDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegistroDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/baja')
  baja(@Param('id', ParseIntPipe) id: number) {
    return this.service.baja(id);
  }
}
