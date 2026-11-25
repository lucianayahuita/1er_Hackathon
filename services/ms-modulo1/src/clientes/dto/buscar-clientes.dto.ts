import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, ValidateIf } from 'class-validator';

export class BuscarClientesDto {
  @ApiPropertyOptional({ description: 'Buscar por CI, nombres o apellidos' })
  @ValidateIf((_obj, value) => value !== undefined)
  @IsString({ message: 'La búsqueda debe ser texto' })
  q?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @ValidateIf((_obj, value) => value !== undefined)
  @IsIn(['true', 'false'], { message: 'El filtro activo debe ser true o false' })
  activo?: string;
}
