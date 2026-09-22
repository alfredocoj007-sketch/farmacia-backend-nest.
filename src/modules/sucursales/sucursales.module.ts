import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Municipio } from '../../database/entities/municipio.entity';
import { Departamento } from '../../database/entities/departamento.entity';
import { Empleado } from '../../database/entities/empleado.entity';
import { Caja } from '../../database/entities/caja.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { ActivoFijo } from '../../database/entities/activo-fijo.entity';
import { AuditoriaEvento } from '../../database/entities/auditoria-evento.entity';
import { SucursalesController } from './sucursales.controller';
import { SucursalesService } from './sucursales.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sucursal,
      Municipio,
      Departamento,
      Empleado,
      Caja,
      Inventario,
      ActivoFijo,
      AuditoriaEvento,
    ]),
    AuthModule,
  ],
  controllers: [SucursalesController],
  providers: [SucursalesService],
  exports: [SucursalesService],
})
export class SucursalesModule {}
