import { Global, Module } from '@nestjs/common';
import { Modulo1Client } from './modulo1.client';
import { Modulo2Client } from './modulo2.client';

@Global()
@Module({ providers: [Modulo1Client, Modulo2Client], exports: [Modulo1Client, Modulo2Client] })
export class IntegracionModule {}
