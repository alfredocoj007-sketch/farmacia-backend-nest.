import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivoFijo } from '../../database/entities/activo-fijo.entity';
import { CategoriaActivo } from '../../database/entities/categoria-activo.entity';
import { HistorialActivo } from '../../database/entities/historial-activo.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { ActivosFijosService } from './activos-fijos.service';
import { ActivosFijosController } from './activos-fijos.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivoFijo,
      CategoriaActivo,
      HistorialActivo,
      Sucursal,
    ]),
    AuthModule,
  ],
  controllers: [ActivosFijosController],
  providers: [ActivosFijosService],
  exports: [ActivosFijosService],
})
export class ActivosFijosModule {}
