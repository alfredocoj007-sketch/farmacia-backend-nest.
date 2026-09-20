import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VentasService } from './ventas.service';
import { CreateVentaPosDto } from './dto/create-venta-pos.dto';
import { QueryVentasDto } from './dto/query-ventas.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { Repository } from 'typeorm';

@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'VENDEDOR', 'GERENTE')
export class VentasController {
  constructor(
    private readonly ventasService: VentasService,
    @InjectRepository(MetodoPago)
    private readonly metodoPagoRepo: Repository<MetodoPago>,
  ) {}

  @Post()
  async registrarVenta(@Body() dto: CreateVentaPosDto, @Req() req: any) {
    return this.ventasService.registrarVenta(dto, req.user);
  }

  @Get()
  async listarVentas(@Query() query: QueryVentasDto) {
    return this.ventasService.listarVentas(query);
  }

  @Get('metodos-pago')
  async listarMetodosPago() {
    let metodos = await this.metodoPagoRepo.find({
      where: { estado: 'ACTIVO' },
      order: { metodoPagoId: 'ASC' },
    });

    if (metodos.length === 0) {
      const defaults = ['EFECTIVO', 'TARJETA DE DÉBITO / CRÉDITO', 'TRANSFERENCIA BANCARIA'];
      for (const nombre of defaults) {
        const nuevo = this.metodoPagoRepo.create({ nombre, estado: 'ACTIVO' });
        await this.metodoPagoRepo.save(nuevo);
      }
      metodos = await this.metodoPagoRepo.find({ where: { estado: 'ACTIVO' } });
    }

    return metodos;
  }

  @Get('sesion-caja/:sucursalId')
  async verificarSesionCaja(@Param('sucursalId', ParseIntPipe) sucursalId: number) {
    return this.ventasService.verificarSesionCajaSucursal(sucursalId);
  }

  @Get('productos')
  async buscarProductos(
    @Query('termino') termino: string = '',
    @Query('sucursalId', ParseIntPipe) sucursalId: number = 1,
  ) {
    return this.ventasService.buscarProductosPos(termino, sucursalId);
  }

  @Get(':id')
  async obtenerVentaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.obtenerVentaPorId(id);
  }
}
