import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaProducto } from '../../database/entities/categoria-producto.entity';
import { CategoriasProductoController } from './categorias-producto.controller';
import { CategoriasProductoService } from './categorias-producto.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CategoriaProducto]), AuthModule],
  controllers: [CategoriasProductoController],
  providers: [CategoriasProductoService],
})
export class CategoriasProductoModule {}
