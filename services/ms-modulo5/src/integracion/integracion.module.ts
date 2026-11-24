import { Global, Module } from '@nestjs/common';
import { IntegracionController } from './integracion.controller';
import { Modulo1Client } from './modulo1.client';

@Global()
@Module({ controllers: [IntegracionController], providers: [Modulo1Client], exports: [Modulo1Client] })
export class IntegracionModule {}
