import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caja } from '../../database/entities/caja.entity';
import { SesionCaja } from '../../database/entities/sesion-caja.entity';
import { MovimientoCaja } from '../../database/entities/movimiento-caja.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Empleado } from '../../database/entities/empleado.entity';
import { CajasService } from './cajas.service';
import { CajasController } from './cajas.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Caja,
      SesionCaja,
      MovimientoCaja,
      MetodoPago,
      Sucursal,
      Empleado,
    ]),
    AuthModule,
  ],
  controllers: [CajasController],
  providers: [CajasService],
  exports: [CajasService],
})
export class CajasModule {}
