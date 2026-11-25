import { ApiProperty } from '@nestjs/swagger';
import { Rol } from '@prisma/client';

export class LoginRespuestaDto {
  @ApiProperty() id: number;
  @ApiProperty() nombres: string;
  @ApiProperty() apellidos: string;
  @ApiProperty() usuario: string;
  @ApiProperty({ enum: Rol }) rol: Rol;
  @ApiProperty({ description: 'Copiar este valor en Authorize de Swagger (sin escribir Bearer)' })
  access_token: string;
  @ApiProperty({ example: 'Bearer' }) token_type: string;
  @ApiProperty({ example: 3600, description: 'Vigencia del token en segundos' }) expires_in: number;
}
