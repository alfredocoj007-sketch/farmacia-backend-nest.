import { Controller, Get, UseGuards } from '@nestjs/common';
import { LaboratoriosService } from './laboratorios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('laboratorios')
export class LaboratoriosController {
  constructor(private readonly laboratoriosService: LaboratoriosService) {}

  @Get()
  findAll() {
    return this.laboratoriosService.findAll();
  }
}
