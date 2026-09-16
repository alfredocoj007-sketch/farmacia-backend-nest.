import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Laboratorio } from '../../database/entities/laboratorio.entity';
import { LaboratoriosController } from './laboratorios.controller';
import { LaboratoriosService } from './laboratorios.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Laboratorio]), AuthModule],
  controllers: [LaboratoriosController],
  providers: [LaboratoriosService],
})
export class LaboratoriosModule {}
