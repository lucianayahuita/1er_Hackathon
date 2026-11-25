import { SetMetadata } from '@nestjs/common';

export type PoliticaAcceso = 'publico' | 'propio' | 'consulta' | 'ADMIN';
export const ACCESO = 'clientes:acceso';
// Sin una política explícita el guard deniega la operación.
export const Acceso = (politica: PoliticaAcceso) => SetMetadata(ACCESO, politica);
