import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../../database/entities/pedido.entity';
import { PedidoDetalle } from '../../database/entities/pedido-detalle.entity';
import { Entrega } from '../../database/entities/entrega.entity';
import { Cliente } from '../../database/entities/cliente.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Producto } from '../../database/entities/producto.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { Lote } from '../../database/entities/lote.entity';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pedido,
      PedidoDetalle,
      Entrega,
      Cliente,
      MetodoPago,
      Sucursal,
      Producto,
      Inventario,
      Lote,
    ]),
    AuthModule,
  ],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}
