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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ActivosFijosService } from './activos-fijos.service';
import { CreateActivoFijoDto } from './dto/create-activo-fijo.dto';
import { TrasladarActivoDto } from './dto/trasladar-activo.dto';
import { MantenimientoActivoDto } from './dto/mantenimiento-activo.dto';
import { QueryActivoFijoDto } from './dto/query-activo-fijo.dto';

@Controller('activos-fijos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'FARMACEUTICO', 'GERENTE')
export class ActivosFijosController {
  constructor(private readonly activosService: ActivosFijosService) {}

  @Get('categorias')
  listarCategorias() {
    return this.activosService.listarCategorias();
  }

  @Get('estadisticas')
  obtenerEstadisticas(
    @CurrentUser() user: AuthenticatedUser,
    @Query('sucursalId') sucursalId?: string,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    const effectiveSucursalId = esAdmin
      ? sucursalId
        ? Number(sucursalId)
        : undefined
      : (user?.sucursalId ?? undefined);

    return this.activosService.obtenerEstadisticas(effectiveSucursalId);
  }

  @Get()
  listar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryActivoFijoDto,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    if (!esAdmin && user?.sucursalId) {
      query.sucursalId = user.sucursalId;
    }
    return this.activosService.listar(query);
  }

  @Get(':activoId')
  obtenerPorId(
    @Param('activoId', ParseIntPipe) activoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    const sucursalId = !esAdmin ? (user?.sucursalId ?? undefined) : undefined;
    return this.activosService.obtenerPorId(activoId, sucursalId);
  }

  @Post()
  crear(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateActivoFijoDto,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    if (!esAdmin && user?.sucursalId) {
      dto.sucursalId = user.sucursalId;
    }
    return this.activosService.crear(dto, user);
  }

  @Post(':activoId/trasladar')
  trasladar(
    @Param('activoId', ParseIntPipe) activoId: number,
    @Body() dto: TrasladarActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    const sucursalId = !esAdmin ? (user?.sucursalId ?? undefined) : undefined;
    return this.activosService.trasladar(activoId, dto, sucursalId, user);
  }

  @Patch(':activoId/mantenimiento')
  registrarMantenimiento(
    @Param('activoId', ParseIntPipe) activoId: number,
    @Body() dto: MantenimientoActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    const sucursalId = !esAdmin ? (user?.sucursalId ?? undefined) : undefined;
    return this.activosService.registrarMantenimiento(activoId, dto, sucursalId, user);
  }
}
