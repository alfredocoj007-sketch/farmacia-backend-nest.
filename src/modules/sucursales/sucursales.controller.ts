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
import { SucursalesService } from './sucursales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { QuerySucursalesDto } from './dto/query-sucursales.dto';
import { CreateDepartamentoDto } from './dto/create-departamento.dto';
import { CreateMunicipioDto } from './dto/create-municipio.dto';

@UseGuards(JwtAuthGuard)
@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Get()
  findAll(@Query() query: QuerySucursalesDto) {
    return this.sucursalesService.findAll(query);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('estadisticas')
  getEstadisticasRed() {
    return this.sucursalesService.getEstadisticasRed();
  }

  @Get('departamentos')
  getDepartamentos() {
    return this.sucursalesService.getDepartamentos();
  }

  @Get('municipios')
  getMunicipios(@Query('departamentoId') departamentoId?: string) {
    const depId = departamentoId ? parseInt(departamentoId, 10) : undefined;
    return this.sucursalesService.getMunicipios(depId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('departamentos')
  createDepartamento(@Body() dto: CreateDepartamentoDto) {
    return this.sucursalesService.createDepartamento(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('municipios')
  createMunicipio(@Body() dto: CreateMunicipioDto) {
    return this.sucursalesService.createMunicipio(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateSucursalDto) {
    return this.sucursalesService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSucursalDto,
  ) {
    return this.sucursalesService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: string,
  ) {
    return this.sucursalesService.cambiarEstado(id, estado);
  }
}
