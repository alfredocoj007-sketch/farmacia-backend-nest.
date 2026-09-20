import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../../database/entities/pedido.entity';
import { PedidoDetalle } from '../../database/entities/pedido-detalle.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { Lote } from '../../database/entities/lote.entity';
import { MovimientoInventario } from '../../database/entities/movimiento-inventario.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Cliente } from '../../database/entities/cliente.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { Producto } from '../../database/entities/producto.entity';
import { SesionCaja } from '../../database/entities/sesion-caja.entity';
import { MovimientoCaja } from '../../database/entities/movimiento-caja.entity';
import { Empleado } from '../../database/entities/empleado.entity';
import { Caja } from '../../database/entities/caja.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pedido,
      PedidoDetalle,
      Inventario,
      Lote,
      MovimientoInventario,
      Sucursal,
      Cliente,
      MetodoPago,
      Producto,
      SesionCaja,
      MovimientoCaja,
      Empleado,
      Caja,
    ]),
    AuditoriaModule,
    AuthModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
