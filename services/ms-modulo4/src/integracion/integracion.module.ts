import { Global, Module } from '@nestjs/common';
import { Modulo2Client } from './modulo2.client';

@Global()
@Module({ providers: [Modulo2Client], exports: [Modulo2Client] })
export class IntegracionModule {}
