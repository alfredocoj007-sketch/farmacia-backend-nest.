import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivosFijosService } from './activos-fijos.service';
import { CreateActivoFijoDto } from './dto/create-activo-fijo.dto';
import { TrasladarActivoDto } from './dto/trasladar-activo.dto';
import { MantenimientoActivoDto } from './dto/mantenimiento-activo.dto';
import { QueryActivoFijoDto } from './dto/query-activo-fijo.dto';

@Controller('activos-fijos')
@UseGuards(JwtAuthGuard)
export class ActivosFijosController {
  constructor(private readonly activosService: ActivosFijosService) {}

  @Get('categorias')
  listarCategorias() {
    return this.activosService.listarCategorias();
  }

  @Get('estadisticas')
  obtenerEstadisticas() {
    return this.activosService.obtenerEstadisticas();
  }

  @Get()
  listar(@Query() query: QueryActivoFijoDto) {
    return this.activosService.listar(query);
  }

  @Get(':activoId')
  obtenerPorId(@Param('activoId', ParseIntPipe) activoId: number) {
    return this.activosService.obtenerPorId(activoId);
  }

  @Post()
  crear(@Body() dto: CreateActivoFijoDto) {
    return this.activosService.crear(dto);
  }

  @Post(':activoId/trasladar')
  trasladar(
    @Param('activoId', ParseIntPipe) activoId: number,
    @Body() dto: TrasladarActivoDto,
  ) {
    return this.activosService.trasladar(activoId, dto);
  }

  @Patch(':activoId/mantenimiento')
  registrarMantenimiento(
    @Param('activoId', ParseIntPipe) activoId: number,
    @Body() dto: MantenimientoActivoDto,
  ) {
    return this.activosService.registrarMantenimiento(activoId, dto);
  }
}
