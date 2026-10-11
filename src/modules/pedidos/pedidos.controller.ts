import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PedidosService } from './pedidos.service';
import { CreatePedidoCallCenterDto } from './dto/create-pedido-callcenter.dto';
import { CambiarEstadoPedidoDto } from './dto/cambiar-estado-pedido.dto';
import { QueryPedidosDto } from './dto/query-pedidos.dto';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('pedidos')
@UseGuards(JwtAuthGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get('estadisticas')
  obtenerEstadisticas(
    @CurrentUser() user: AuthenticatedUser,
    @Query('sucursalId') sucursalId?: string,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    const effectiveSucursalId = esAdmin
      ? (sucursalId ? Number(sucursalId) : undefined)
      : (user?.sucursalId ?? undefined);
    return this.pedidosService.obtenerEstadisticasCallCenter(effectiveSucursalId);
  }

  @Get('clientes/buscar')
  buscarClientes(@Query('q') query: string) {
    return this.pedidosService.buscarClientes(query || '');
  }

  @Post('disponibilidad')
  consultarDisponibilidad(@Body() dto: ConsultarDisponibilidadDto) {
    return this.pedidosService.consultarDisponibilidad(dto);
  }

  @Get('medicamentos-disponibles')
  obtenerMedicamentosDisponibles() {
    return this.pedidosService.obtenerMedicamentosDisponiblesCallCenter();
  }

  @Get()
  listar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryPedidosDto,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    if (!esAdmin && user?.sucursalId) {
      query.sucursalId = user.sucursalId;
    }
    return this.pedidosService.listarPedidos(query);
  }

  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.obtenerPedidoPorId(id);
  }

  @Post('call-center')
  crearPedidoCallCenter(@Body() dto: CreatePedidoCallCenterDto, @Request() req: any) {
    return this.pedidosService.crearPedidoCallCenter(dto, req.user);
  }

  @Patch(':id/estado')
  actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoPedidoDto,
    @Request() req: any,
  ) {
    return this.pedidosService.actualizarEstadoPedido(id, dto, req?.user);
  }
}
