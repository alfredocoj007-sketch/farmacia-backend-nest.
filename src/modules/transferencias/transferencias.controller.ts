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
import { TransferenciasService } from './transferencias.service';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { EnviarTransferenciaDto } from './dto/enviar-transferencia.dto';
import { RecibirTransferenciaDto } from './dto/recibir-transferencia.dto';
import { QueryTransferenciasDto } from './dto/query-transferencias.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'FARMACEUTICO', 'GERENTE')
@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly transferenciasService: TransferenciasService) {}

  @Post()
  create(
    @Body() dto: CreateTransferenciaDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.transferenciasService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() query: QueryTransferenciasDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const esAdmin = user?.rolNombre?.toUpperCase() === 'ADMIN';
    if (!esAdmin && user?.sucursalId) {
      query.sucursalId = user.sucursalId;
    }
    return this.transferenciasService.findAll(query);
  }

  @Get('lotes-disponibles')
  getLotesDisponibles(@Query('sucursalOrigenId') sucursalOrigenId?: string) {
    const id = sucursalOrigenId ? Number(sucursalOrigenId) : undefined;
    return this.transferenciasService.getLotesDisponibles(id);
  }

  @Get('pendientes-conteo')
  obtenerConteoPendientes(@CurrentUser() user: AuthenticatedUser) {
    return this.transferenciasService.obtenerConteoPendientes(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transferenciasService.findOne(id);
  }

  @Patch(':id/enviar')
  enviar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarTransferenciaDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.transferenciasService.enviar(id, dto, user);
  }

  @Patch(':id/recibir')
  recibir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecibirTransferenciaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transferenciasService.recibir(id, dto, user);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body('observacion') observacion?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.transferenciasService.cancelar(id, observacion, user);
  }
}
