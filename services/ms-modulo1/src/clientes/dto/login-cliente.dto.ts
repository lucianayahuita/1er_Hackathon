import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginClienteDto {
  @ApiProperty({ example: 'mquispe' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'El usuario debe ser texto' })
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  usuario: string;

  @ApiProperty({ example: 'Segura2026', writeOnly: true })
  @IsString({ message: 'La contraseña debe ser texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
