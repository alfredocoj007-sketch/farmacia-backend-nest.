import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductosModule } from './modules/productos/productos.module';
import { LotesModule } from './modules/lotes/lotes.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';
import { CategoriasProductoModule } from './modules/categorias-producto/categorias-producto.module';
import { LaboratoriosModule } from './modules/laboratorios/laboratorios.module';
import { UnidadesMedidaModule } from './modules/unidades-medida/unidades-medida.module';
import { TransferenciasModule } from './modules/transferencias/transferencias.module';
import { CajasModule } from './modules/cajas/cajas.module';
import { ActivosFijosModule } from './modules/activos-fijos/activos-fijos.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { PlanillasModule } from './modules/planillas/planillas.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';

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
    TransferenciasModule,
    CajasModule,
    ActivosFijosModule,
    PedidosModule,
    PlanillasModule,
    AuditoriaModule,
    VentasModule,
    UsuariosModule,
  ],
})
export class AppModule implements NestModule {
  /**
   * Configuración de la Cadena de Procesamiento de Middlewares HTTP (Chain of Responsibility):
   * 1. RequestIdMiddleware: Inyecta y propaga X-Request-Id.
   * 2. HttpLoggerMiddleware: Mide tiempos de respuesta y audita el tráfico.
   * La cadena fluye secuencialmente mediante llamadas a next().
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, HttpLoggerMiddleware)
      .forRoutes('*');
  }
}
