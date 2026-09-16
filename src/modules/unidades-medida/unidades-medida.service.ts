import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnidadMedida } from '../../database/entities/unidad-medida.entity';

@Injectable()
export class UnidadesMedidaService {
  constructor(
    @InjectRepository(UnidadMedida)
    private readonly unidadMedidaRepo: Repository<UnidadMedida>,
  ) {}

  findAll(): Promise<UnidadMedida[]> {
    return this.unidadMedidaRepo.find({ order: { nombre: 'ASC' } });
  }
}
