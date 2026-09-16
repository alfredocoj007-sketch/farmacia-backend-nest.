import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sucursal } from '../../database/entities/sucursal.entity';

@Injectable()
export class SucursalesService {
  constructor(
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
  ) {}

  findAll(): Promise<Sucursal[]> {
    return this.sucursalRepo.find({ order: { nombre: 'ASC' } });
  }
}
