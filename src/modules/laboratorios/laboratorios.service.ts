import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Laboratorio } from '../../database/entities/laboratorio.entity';

@Injectable()
export class LaboratoriosService {
  constructor(
    @InjectRepository(Laboratorio)
    private readonly laboratorioRepo: Repository<Laboratorio>,
  ) {}

  findAll(): Promise<Laboratorio[]> {
    return this.laboratorioRepo.find({ order: { nombre: 'ASC' } });
  }
}
