import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum TipoTransferenciaDto {
  PROPIA = 'PROPIA',
  TERCERO = 'TERCERO',
  INTERBANCARIA = 'INTERBANCARIA',
}

export class CreateTransferenciaDto {
  @ApiProperty({ enum: TipoTransferenciaDto, example: TipoTransferenciaDto.TERCERO })
  @IsEnum(TipoTransferenciaDto)
  tipo: TipoTransferenciaDto;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cuentaOrigenId: number;

  @ApiProperty({ example: '1000000003' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cuentaDestinoNumero: string;

  @ApiPropertyOptional({ example: 'BNB' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bancoDestino?: string;

  @ApiPropertyOptional({ example: 'Carlos Mendoza' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  titularDestino?: string;

  @ApiProperty({ example: 250 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  monto: number;

  @ApiProperty({ example: 'Pago alquiler', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  glosa: string;

  @ApiPropertyOptional({
    description: 'Clave opcional de idempotencia para evitar transferencias duplicadas',
    example: 'trf-req-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  claveIdempotencia?: string;
}
