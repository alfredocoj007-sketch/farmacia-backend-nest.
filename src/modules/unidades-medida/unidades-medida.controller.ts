import { Controller, Get, UseGuards } from '@nestjs/common';
import { UnidadesMedidaService } from './unidades-medida.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('unidades-medida')
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @Get()
  findAll() {
    return this.unidadesMedidaService.findAll();
  }
}
