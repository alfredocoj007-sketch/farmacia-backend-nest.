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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'FARMACEUTICO', 'GERENTE')
@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly transferenciasService: TransferenciasService) {}

  @Post()
  create(@Body() dto: CreateTransferenciaDto) {
    return this.transferenciasService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryTransferenciasDto) {
    return this.transferenciasService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transferenciasService.findOne(id);
  }

  @Patch(':id/enviar')
  enviar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarTransferenciaDto,
  ) {
    return this.transferenciasService.enviar(id, dto);
  }

  @Patch(':id/recibir')
  recibir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecibirTransferenciaDto,
  ) {
    return this.transferenciasService.recibir(id, dto);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body('observacion') observacion?: string,
  ) {
    return this.transferenciasService.cancelar(id, observacion);
  }
}
