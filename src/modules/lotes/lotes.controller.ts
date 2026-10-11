import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { LotesService } from './lotes.service';
import { CreateEntradaLoteDto } from './dto/create-entrada-lote.dto';
import { CreateCompraLoteDto } from './dto/create-compra-lote.dto';
import { CreateSalidaLoteDto } from './dto/create-salida-lote.dto';
import { QueryLotesDto } from './dto/query-lotes.dto';
import { QueryMovimientosDto } from './dto/query-movimientos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('lotes')
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'FARMACEUTICO')
  @Post('entrada')
  registrarEntrada(
    @Body() dto: CreateEntradaLoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    if (!esAdmin && user?.sucursalId) {
      dto.sucursalId = user.sucursalId;
    }
    return this.lotesService.registrarEntrada(dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'FARMACEUTICO')
  @Post('compra')
  registrarCompra(
    @Body() dto: CreateCompraLoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    if (!esAdmin && user?.sucursalId) {
      dto.sucursalId = user.sucursalId;
    }
    return this.lotesService.registrarCompra(dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'VENDEDOR', 'FARMACEUTICO', 'GERENTE')
  @Post('salida')
  registrarSalida(
    @Body() dto: CreateSalidaLoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    if (!esAdmin && user?.sucursalId) {
      dto.sucursalId = user.sucursalId;
    }
    return this.lotesService.registrarSalida(dto, user);
  }

  @Get()
  findAll(
    @Query() query: QueryLotesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    if (!esAdmin && user?.sucursalId) {
      query.sucursalId = user.sucursalId;
    }
    return this.lotesService.findAll(query);
  }

  @Get('movimientos/todos')
  findAllMovimientos(
    @Query() query: QueryMovimientosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    if (!esAdmin && user?.sucursalId) {
      query.sucursalId = user.sucursalId;
    }
    return this.lotesService.findAllMovimientos(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    const sucursalId = !esAdmin ? (user?.sucursalId ?? undefined) : undefined;
    return this.lotesService.findOne(id, sucursalId);
  }

  @Get(':id/movimientos')
  findMovimientos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    const sucursalId = !esAdmin ? (user?.sucursalId ?? undefined) : undefined;
    return this.lotesService.findMovimientos(id, sucursalId);
  }
}
