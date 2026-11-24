import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreatePagoDto {
  @ApiProperty({ example: 1, description: 'id del cliente en ms-modulo1' })
  @Type(() => Number)
  @IsInt({ message: 'clienteId debe ser un número entero' })
  @Min(1, { message: 'clienteId debe ser mayor a 0' })
  clienteId!: number;

  @ApiProperty({ example: 1, description: 'id de la cuenta en ms-modulo2' })
  @Type(() => Number)
  @IsInt({ message: 'cuentaId debe ser un número entero' })
  @Min(1, { message: 'cuentaId debe ser mayor a 0' })
  cuentaId!: number;

  @ApiProperty({ example: 3, description: 'id de la deuda pendiente (GET /proveedores/:id/deudas)' })
  @Type(() => Number)
  @IsInt({ message: 'deudaId debe ser un número entero' })
  @Min(1, { message: 'deudaId debe ser mayor a 0' })
  deudaId!: number;
}
