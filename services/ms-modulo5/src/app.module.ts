import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PrestamosModule } from './prestamos/prestamos.module';
import { IntegracionModule } from './integracion/integracion.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, PrestamosModule, IntegracionModule],
  controllers: [HealthController],
})
export class AppModule {}
