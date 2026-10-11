import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { Pedido } from '../../database/entities/pedido.entity';
import { PedidoDetalle } from '../../database/entities/pedido-detalle.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { Lote } from '../../database/entities/lote.entity';
import { Producto } from '../../database/entities/producto.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { SesionCaja } from '../../database/entities/sesion-caja.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pedido,
      PedidoDetalle,
      Inventario,
      Lote,
      Producto,
      Sucursal,
      SesionCaja,
      MetodoPago,
    ]),
    AuthModule,
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
