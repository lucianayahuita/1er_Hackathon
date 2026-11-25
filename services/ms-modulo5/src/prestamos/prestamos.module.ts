import { Module } from '@nestjs/common';
import { IntegracionModule } from '../integracion/integracion.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrestamosController } from './prestamos.controller';
import { PrestamosService } from './prestamos.service';
import { AccesoGuard } from './acceso.guard';

@Module({ imports: [PrismaModule, IntegracionModule], controllers: [PrestamosController], providers: [PrestamosService, AccesoGuard] })
export class PrestamosModule {}
