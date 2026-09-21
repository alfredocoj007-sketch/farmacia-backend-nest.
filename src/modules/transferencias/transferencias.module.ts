import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transferencia } from '../../database/entities/transferencia.entity';
import { TransferenciaDetalle } from '../../database/entities/transferencia-detalle.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Lote } from '../../database/entities/lote.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { MovimientoInventario } from '../../database/entities/movimiento-inventario.entity';
import { TransferenciasController } from './transferencias.controller';
import { TransferenciasService } from './transferencias.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transferencia,
      TransferenciaDetalle,
      Sucursal,
      Lote,
      Inventario,
      MovimientoInventario,
    ]),
    AuthModule,
  ],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
  exports: [TransferenciasService],
})
export class TransferenciasModule {}
