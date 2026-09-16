import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lote } from '../../database/entities/lote.entity';
import { Producto } from '../../database/entities/producto.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { MovimientoInventario } from '../../database/entities/movimiento-inventario.entity';
import { LotesController } from './lotes.controller';
import { LotesService } from './lotes.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lote, Producto, Sucursal, Inventario, MovimientoInventario]),
    AuthModule,
  ],
  controllers: [LotesController],
  providers: [LotesService],
})
export class LotesModule {}
