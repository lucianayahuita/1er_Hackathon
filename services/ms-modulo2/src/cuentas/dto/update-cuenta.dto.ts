import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MonedaDto } from './create-cuenta.dto';

export class UpdateCuentaDto {
  @ApiPropertyOptional({ enum: MonedaDto })
  @IsOptional()
  @IsEnum(MonedaDto)
  moneda?: MonedaDto;
}
