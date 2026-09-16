import { Controller, Get, UseGuards } from '@nestjs/common';
import { CategoriasProductoService } from './categorias-producto.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('categorias-producto')
export class CategoriasProductoController {
  constructor(private readonly categoriasProductoService: CategoriasProductoService) {}

  @Get()
  findAll() {
    return this.categoriasProductoService.findAll();
  }
}
