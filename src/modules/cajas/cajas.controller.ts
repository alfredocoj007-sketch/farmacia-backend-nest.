import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CajasService } from './cajas.service';
import { AbrirSesionDto } from './dto/abrir-sesion.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { CerrarSesionDto } from './dto/cerrar-sesion.dto';
import { CreateCajaDto } from './dto/create-caja.dto';

@Controller('cajas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'VENDEDOR', 'GERENTE')
export class CajasController {
  constructor(private readonly cajasService: CajasService) {}

  @Get('metodos-pago')
  listarMetodosPago() {
    return this.cajasService.listarMetodosPago();
  }

  @Get('sucursal/:sucursalId')
  listarPorSucursal(@Param('sucursalId', ParseIntPipe) sucursalId: number) {
    return this.cajasService.listarCajasPorSucursal(sucursalId);
  }

  @Get(':cajaId/sesion-activa')
  obtenerSesionActiva(@Param('cajaId', ParseIntPipe) cajaId: number) {
    return this.cajasService.obtenerSesionActiva(cajaId);
  }

  @Get(':cajaId/historial')
  obtenerHistorialSesiones(@Param('cajaId', ParseIntPipe) cajaId: number) {
    return this.cajasService.obtenerHistorialSesiones(cajaId);
  }

  @Post('sesion/abrir')
  abrirSesion(@Body() dto: AbrirSesionDto, @Request() req: any) {
    const empleadoId = req.user.empleadoId;
    return this.cajasService.abrirSesion(dto, empleadoId);
  }

  @Post('sesion/movimiento')
  registrarMovimiento(@Body() dto: RegistrarMovimientoDto, @Request() req: any) {
    const empleadoId = req.user.empleadoId;
    return this.cajasService.registrarMovimiento(dto, empleadoId);
  }

  @Post('sesion/cerrar')
  cerrarSesion(@Body() dto: CerrarSesionDto, @Request() req: any) {
    const empleadoId = req.user.empleadoId;
    return this.cajasService.cerrarYArquearSesion(dto, empleadoId);
  }

  @Roles('ADMIN')
  @Post()
  crearCaja(@Body() dto: CreateCajaDto) {
    return this.cajasService.crearCaja(dto);
  }
}
