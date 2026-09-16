import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { LotesService } from './lotes.service';
import { CreateEntradaLoteDto } from './dto/create-entrada-lote.dto';
import { CreateSalidaLoteDto } from './dto/create-salida-lote.dto';
import { QueryLotesDto } from './dto/query-lotes.dto';
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
  @Roles('ADMIN')
  @Post('entrada')
  registrarEntrada(@Body() dto: CreateEntradaLoteDto) {
    return this.lotesService.registrarEntrada(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'VENDEDOR')
  @Post('salida')
  registrarSalida(@Body() dto: CreateSalidaLoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.lotesService.registrarSalida(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryLotesDto) {
    return this.lotesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lotesService.findOne(id);
  }

  @Get(':id/movimientos')
  findMovimientos(@Param('id', ParseIntPipe) id: number) {
    return this.lotesService.findMovimientos(id);
  }
}
