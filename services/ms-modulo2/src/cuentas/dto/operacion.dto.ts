import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class OperacionDto {
  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  monto: number;

  @ApiPropertyOptional({ example: 'Depósito en ventanilla', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;
}
