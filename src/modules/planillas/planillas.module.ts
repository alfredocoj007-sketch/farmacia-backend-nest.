import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from '../../database/entities/empleado.entity';
import { Puesto } from '../../database/entities/puesto.entity';
import { Planilla } from '../../database/entities/planilla.entity';
import { PlanillaDetalle } from '../../database/entities/planilla-detalle.entity';
import { HistorialSalario } from '../../database/entities/historial-salario.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { AuthModule } from '../auth/auth.module';
import { PlanillasService } from './planillas.service';
import { PlanillasController } from './planillas.controller';
import { BoletasPdfService } from './boletas-pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Empleado,
      Puesto,
      Planilla,
      PlanillaDetalle,
      HistorialSalario,
      Sucursal,
    ]),
    AuthModule,
  ],
  controllers: [PlanillasController],
  providers: [PlanillasService, BoletasPdfService],
  exports: [PlanillasService, BoletasPdfService],
})
export class PlanillasModule {}
