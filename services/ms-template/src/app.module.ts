import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RegistrosModule } from './registros/registros.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, RegistrosModule],
  controllers: [HealthController],
})
export class AppModule {}
