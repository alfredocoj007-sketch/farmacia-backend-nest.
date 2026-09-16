import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { SucursalesController } from './sucursales.controller';
import { SucursalesService } from './sucursales.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sucursal]), AuthModule],
  controllers: [SucursalesController],
  providers: [SucursalesService],
})
export class SucursalesModule {}
