import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateClienteDto } from './create-cliente.dto';

// Omitir password evita que el PATCH modifique credenciales o estados internos.
export class UpdateClienteDto extends PartialType(
  OmitType(CreateClienteDto, ['password'] as const),
  { skipNullProperties: false },
) {}
