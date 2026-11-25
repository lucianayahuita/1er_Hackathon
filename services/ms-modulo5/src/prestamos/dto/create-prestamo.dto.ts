import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreatePrestamoDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() @Min(1)
  clienteId: number;

  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() @Min(1)
  cuentaDesembolsoId: number;

  @ApiProperty({ example: 25000, minimum: 1000, maximum: 200000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1000) @Max(200000)
  monto: number;

  @ApiPropertyOptional({ example: 12, minimum: 0, maximum: 100 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100)
  tasaAnual?: number;

  @ApiProperty({ example: 24, minimum: 6, maximum: 60 }) @Type(() => Number) @IsInt() @Min(6) @Max(60)
  plazoMeses: number;
}
