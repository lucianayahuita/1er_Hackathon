import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { LoginClienteDto } from './dto/login-cliente.dto';
import { AccesoGuard } from './acceso.guard';
import { Acceso } from './acceso.decorator';
import { LoginRespuestaDto } from './dto/login-respuesta.dto';
import { BuscarClientesDto } from './dto/buscar-clientes.dto';

@ApiTags('clientes')
@Controller('clientes')
@UseGuards(AccesoGuard)
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  @Acceso(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar y buscar clientes (ADMIN)' })
  findAll(@Query() consulta: BuscarClientesDto) {
    return this.service.findAll(consulta.q, consulta.activo === undefined ? undefined : consulta.activo === 'true');
  }

  @Get('stats')
  @Acceso(Rol.ADMIN)
  @ApiBearerAuth()
  stats() { return this.service.stats(); }

  @Post('login')
  @Acceso('publico')
  @ApiOperation({ summary: 'Iniciar sesión y obtener un JWT para Authorize' })
  @ApiResponse({ status: 200, type: LoginRespuestaDto })
  @HttpCode(200)
  login(@Body() dto: LoginClienteDto) { return this.service.login(dto); }

  @Get(':id')
  @Acceso('consulta')
  @ApiBearerAuth()
  @ApiSecurity('servicio')
  @ApiOperation({ summary: 'Consultar: ADMIN, cliente titular o microservicio con X-Service-Key' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @Acceso('publico')
  @ApiOperation({ summary: 'Registrar un cliente (siempre con rol CLIENTE)' })
  create(@Body() dto: CreateClienteDto) { return this.service.create(dto); }

  @Patch(':id')
  @Acceso('propio')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar: ADMIN o cliente titular (sin modificar rol ni contraseña)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClienteDto) { return this.service.update(id, dto); }

  @Patch(':id/baja')
  @Acceso(Rol.ADMIN)
  @ApiBearerAuth()
  baja(@Param('id', ParseIntPipe) id: number) { return this.service.baja(id); }

  @Patch(':id/desbloquear')
  @Acceso(Rol.ADMIN)
  @ApiBearerAuth()
  desbloquear(@Param('id', ParseIntPipe) id: number) { return this.service.desbloquear(id); }
}
