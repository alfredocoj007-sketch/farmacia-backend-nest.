import { Controller, Get, UseGuards } from '@nestjs/common';
import { SucursalesService } from './sucursales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Get()
  findAll() {
    return this.sucursalesService.findAll();
  }
}
