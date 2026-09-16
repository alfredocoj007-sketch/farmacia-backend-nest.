import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from '../../database/entities/producto.entity';
import { CategoriaProducto } from '../../database/entities/categoria-producto.entity';
import { Laboratorio } from '../../database/entities/laboratorio.entity';
import { UnidadMedida } from '../../database/entities/unidad-medida.entity';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, CategoriaProducto, Laboratorio, UnidadMedida]),
    AuthModule,
  ],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}
