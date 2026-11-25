import { Module } from '@nestjs/common';
import { BancosController } from './bancos.controller';
import { TransferenciasController } from './transferencias.controller';
import { TransferenciasService } from './transferencias.service';

@Module({
  controllers: [TransferenciasController, BancosController],
  providers: [TransferenciasService],
  exports: [TransferenciasService],
})
export class TransferenciasModule {}
