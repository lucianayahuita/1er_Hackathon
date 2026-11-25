import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { JwtModule } from '@nestjs/jwt';
import { AccesoGuard } from './acceso.guard';
import { configurarJwt } from './jwt.config';

@Module({
  imports: [JwtModule.registerAsync({ useFactory: configurarJwt })],
  controllers: [ClientesController], providers: [ClientesService, AccesoGuard],
})
export class ClientesModule {}
