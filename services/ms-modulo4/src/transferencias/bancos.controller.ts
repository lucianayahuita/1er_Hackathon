import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransferenciasService } from './transferencias.service';

@ApiTags('bancos')
@Controller('bancos')
export class BancosController {
  constructor(private readonly service: TransferenciasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de bancos para transferencias interbancarias' })
  findAll() {
    return this.service.bancos();
  }
}
