import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaProducto } from '../../database/entities/categoria-producto.entity';

@Injectable()
export class CategoriasProductoService {
  constructor(
    @InjectRepository(CategoriaProducto)
    private readonly categoriaRepo: Repository<CategoriaProducto>,
  ) {}

  findAll(): Promise<CategoriaProducto[]> {
    return this.categoriaRepo.find({ order: { nombre: 'ASC' } });
  }
}
