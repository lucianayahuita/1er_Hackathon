import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength, ValidateIf } from 'class-validator';

const recortar = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateClienteDto {
  @ApiProperty({ example: '8456123' })
  @Transform(recortar)
  @IsString({ message: 'El CI debe ser texto' })
  @IsNotEmpty({ message: 'El CI es obligatorio' })
  ci: string;

  @ApiProperty({ example: 'María' })
  @Transform(recortar)
  @IsString({ message: 'Los nombres deben ser texto' })
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  nombres: string;

  @ApiProperty({ example: 'Quispe Rojas' })
  @Transform(recortar)
  @IsString({ message: 'Los apellidos deben ser texto' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  apellidos: string;

  @ApiProperty({ example: 'maria.quispe@mail.com' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;

  @ApiPropertyOptional({ example: '71234567' })
  @ValidateIf((_obj, value) => value !== undefined)
  @Transform(recortar)
  @IsString({ message: 'El teléfono debe ser texto' })
  telefono?: string;

  @ApiPropertyOptional({ example: 'Av. Arce 2345, La Paz' })
  @ValidateIf((_obj, value) => value !== undefined)
  @Transform(recortar)
  @IsString({ message: 'La dirección debe ser texto' })
  direccion?: string;

  @ApiProperty({ example: 'mquispe' })
  @Transform(recortar)
  @IsString({ message: 'El usuario debe ser texto' })
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  usuario: string;

  @ApiProperty({ example: 'Segura2026', minLength: 8, writeOnly: true })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
