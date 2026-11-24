import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum MonedaDto {
  BOB = 'BOB',
  USD = 'USD',
}

export class CreateCuentaDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId: number;

  @ApiPropertyOptional({ enum: MonedaDto, default: MonedaDto.BOB })
  @IsOptional()
  @IsEnum(MonedaDto)
  moneda?: MonedaDto;
}
