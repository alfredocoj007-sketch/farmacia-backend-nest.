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

@Controller('pedidos')
@UseGuards(JwtAuthGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get('estadisticas')
  obtenerEstadisticas() {
    return this.pedidosService.obtenerEstadisticasCallCenter();
  }

  @Get('clientes/buscar')
  buscarClientes(@Query('q') query: string) {
    return this.pedidosService.buscarClientes(query || '');
  }

  @Post('disponibilidad')
  consultarDisponibilidad(@Body() dto: ConsultarDisponibilidadDto) {
    return this.pedidosService.consultarDisponibilidad(dto);
  }

  @Get()
  listar(@Query() query: QueryPedidosDto) {
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
  ) {
    return this.pedidosService.actualizarEstadoPedido(id, dto);
  }
}
