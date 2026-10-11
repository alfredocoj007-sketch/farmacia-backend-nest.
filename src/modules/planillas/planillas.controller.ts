import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanillasService } from './planillas.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { AjustarSalarioDto } from './dto/ajustar-salario.dto';
import { CreatePlanillaDto } from './dto/create-planilla.dto';
import { UpdatePlanillaDetalleDto } from './dto/update-planilla-detalle.dto';
import { QueryEmpleadosDto } from './dto/query-empleados.dto';
import { PagarPlanillaDto } from './dto/pagar-planilla.dto';

@Controller('planillas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'GERENTE')
export class PlanillasController {
  constructor(private readonly planillasService: PlanillasService) {}

  @Get('puestos')
  listarPuestos() {
    return this.planillasService.listarPuestos();
  }

  @Get('estadisticas')
  obtenerEstadisticas() {
    return this.planillasService.obtenerEstadisticasNomina();
  }

  // ==========================================
  // EMPLEADOS
  // ==========================================

  @Get('empleados')
  listarEmpleados(@Query() query: QueryEmpleadosDto) {
    return this.planillasService.listarEmpleados(query);
  }

  @Get('empleados/:id')
  obtenerEmpleado(@Param('id', ParseIntPipe) id: number) {
    return this.planillasService.obtenerEmpleadoPorId(id);
  }

  @Post('empleados')
  crearEmpleado(@Body() dto: CreateEmpleadoDto) {
    return this.planillasService.crearEmpleado(dto);
  }

  @Patch('empleados/:id')
  actualizarEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmpleadoDto,
  ) {
    return this.planillasService.actualizarEmpleado(id, dto);
  }

  @Post('empleados/:id/ajustar-salario')
  ajustarSalario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AjustarSalarioDto,
  ) {
    return this.planillasService.ajustarSalario(id, dto);
  }

  // ==========================================
  // PLANILLAS
  // ==========================================

  @Get()
  listarPlanillas() {
    return this.planillasService.listarPlanillas();
  }

  @Post()
  generarPlanilla(@Body() dto: CreatePlanillaDto) {
    return this.planillasService.generarPlanilla(dto);
  }

  @Get(':id')
  obtenerPlanilla(@Param('id', ParseIntPipe) id: number) {
    return this.planillasService.obtenerPlanillaPorId(id);
  }

  @Patch(':id/detalle/:detalleId')
  actualizarDetallePlanilla(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: UpdatePlanillaDetalleDto,
  ) {
    return this.planillasService.actualizarDetallePlanilla(id, detalleId, dto);
  }

  @Patch(':id/pagar')
  pagarPlanilla(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: PagarPlanillaDto,
  ) {
    return this.planillasService.pagarPlanilla(id, dto);
  }

  @Patch(':id/cancelar')
  cancelarPlanilla(@Param('id', ParseIntPipe) id: number) {
    return this.planillasService.cancelarPlanilla(id);
  }

  @Get(':id/boletas-pdf')
  async descargarBoletasPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.planillasService.generarBoletasPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Boletas_Planilla_${id}.pdf"`,
    );
    return new StreamableFile(buffer);
  }

  @Get(':id/detalle/:detalleId/boleta-pdf')
  async descargarBoletaIndividualPdf(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.planillasService.generarBoletaIndividualPdf(
      id,
      detalleId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Boleta_Colaborador_${detalleId}.pdf"`,
    );
    return new StreamableFile(buffer);
  }
}
