import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ClientesModule } from './clientes/clientes.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ClientesModule],
  controllers: [HealthController],
})
export class AppModule {}
