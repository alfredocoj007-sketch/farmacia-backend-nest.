import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportesService } from './reportes.service';
import { QueryReportesDto } from './dto/query-reportes.dto';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'GERENTE', 'FARMACEUTICO')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  /**
   * 1. 📈 REPORTE CONSOLIDADO DE VENTAS E INGRESOS
   * Ventas por sucursal, rango de fechas, total facturado, IVA (12%) y métodos de pago
   */
  @Get('ventas')
  obtenerReporteVentas(@Query() dto: QueryReportesDto) {
    return this.reportesService.obtenerReporteVentas(dto);
  }

  /**
   * 2. ⚠️ REPORTE DE RIESGO DE CADUCIDAD Y MERMAS (AUDITORÍA FEFO)
   * Lotes vencidos o próximos a vencer (30, 60, 90 días) y cálculo del costo en Q en riesgo
   */
  @Get('caducidad-fefo')
  obtenerReporteCaducidadFefo(@Query() dto: QueryReportesDto) {
    return this.reportesService.obtenerReporteCaducidadFefo(dto);
  }

  /**
   * 3. 📦 VALORACIÓN GLOBAL DE INVENTARIO
   * Inversión en mercadería (Costo de adquisición vs. Valor venta al público) por sucursal y global
   */
  @Get('valoracion-inventario')
  obtenerReporteValoracionInventario(@Query() dto: QueryReportesDto) {
    return this.reportesService.obtenerReporteValoracionInventario(dto);
  }

  /**
   * 4. 🏆 TOP 10 MEDICAMENTOS MÁS VENDIDOS (ROTACIÓN)
   * Productos estrella con mayor salida por unidades y por ingresos generados
   */
  @Get('top-productos')
  obtenerReporteTopProductos(@Query() dto: QueryReportesDto) {
    return this.reportesService.obtenerReporteTopProductos(dto);
  }

  /**
   * 5. 💵 REPORTE DE ARQUEOS Y CUADRE DE CAJAS
   * Rendimiento de turnos, cajas abiertas/cerradas y auditoría de sobrantes/faltantes
   */
  @Get('cuadre-cajas')
  obtenerReporteCuadreCajas(@Query() dto: QueryReportesDto) {
    return this.reportesService.obtenerReporteCuadreCajas(dto);
  }
}
