import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductosModule } from './modules/productos/productos.module';
import { LotesModule } from './modules/lotes/lotes.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';
import { CategoriasProductoModule } from './modules/categorias-producto/categorias-producto.module';
import { LaboratoriosModule } from './modules/laboratorios/laboratorios.module';
import { UnidadesMedidaModule } from './modules/unidades-medida/unidades-medida.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    ProductosModule,
    LotesModule,
    SucursalesModule,
    CategoriasProductoModule,
    LaboratoriosModule,
    UnidadesMedidaModule,
  ],
})
export class AppModule {}
