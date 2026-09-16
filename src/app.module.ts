import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductosModule } from './modules/productos/productos.module';
import { LotesModule } from './modules/lotes/lotes.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';


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
  ],
})
export class AppModule {}
