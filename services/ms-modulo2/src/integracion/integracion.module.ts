import { Global, Module } from '@nestjs/common';
import { Modulo1Client } from './modulo1.client';

@Global()
@Module({ providers: [Modulo1Client], exports: [Modulo1Client] })
export class IntegracionModule {}
