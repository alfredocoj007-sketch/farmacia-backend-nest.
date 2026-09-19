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
import { AuditoriaService } from './auditoria.service';
import { QueryAuditoriaDto } from './dto/query-auditoria.dto';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  async listarEventos(@Query() query: QueryAuditoriaDto) {
    return this.auditoriaService.listarEventos(query);
  }

  @Get('estadisticas')
  async obtenerEstadisticas() {
    return this.auditoriaService.obtenerEstadisticas();
  }

  @Get('roles-usuarios')
  async obtenerRolesYUsuarios() {
    return this.auditoriaService.obtenerRolesYUsuarios();
  }

  @Get(':id')
  async obtenerEventoPorId(@Param('id', ParseIntPipe) id: number) {
    return this.auditoriaService.obtenerEventoPorId(id);
  }

  @Post()
  async registrarEvento(@Body() dto: CreateAuditoriaDto, @Req() req: any) {
    if (!dto.ipCliente && req.ip) {
      dto.ipCliente = req.ip;
    }
    if (!dto.clientIdentifier && req.user?.username) {
      dto.clientIdentifier = req.user.username;
    }
    return this.auditoriaService.registrarEvento(dto);
  }
}
