import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { IntegracionModule } from './integracion/integracion.module';
import { PrismaModule } from './prisma/prisma.module';
import { TransferenciasModule } from './transferencias/transferencias.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, IntegracionModule, TransferenciasModule],
  controllers: [HealthController],
})
export class AppModule {}
