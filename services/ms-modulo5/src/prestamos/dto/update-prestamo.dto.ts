import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Max, Min, ValidateIf } from 'class-validator';

export class UpdatePrestamoDto {
  @ApiPropertyOptional({ example: 1 }) @ValidateIf((_obj, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1)
  cuentaDesembolsoId?: number;

  @ApiPropertyOptional({ example: 25000, minimum: 1000, maximum: 200000 }) @ValidateIf((_obj, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1000) @Max(200000)
  monto?: number;

  @ApiPropertyOptional({ example: 12, minimum: 0, maximum: 100 }) @ValidateIf((_obj, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100)
  tasaAnual?: number;

  @ApiPropertyOptional({ example: 24, minimum: 6, maximum: 60 }) @ValidateIf((_obj, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(6) @Max(60)
  plazoMeses?: number;
}
