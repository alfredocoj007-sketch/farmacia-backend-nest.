import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from '../../database/entities/producto.entity';
import { CategoriaProducto } from '../../database/entities/categoria-producto.entity';
import { Laboratorio } from '../../database/entities/laboratorio.entity';
import { UnidadMedida } from '../../database/entities/unidad-medida.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { QueryProductosDto } from './dto/query-productos.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,

    @InjectRepository(CategoriaProducto)
    private readonly categoriaRepo: Repository<CategoriaProducto>,

    @InjectRepository(Laboratorio)
    private readonly laboratorioRepo: Repository<Laboratorio>,

    @InjectRepository(UnidadMedida)
    private readonly unidadMedidaRepo: Repository<UnidadMedida>,
  ) {}

  async create(dto: CreateProductoDto): Promise<Producto> {
    await this.assertCodigoDisponible(dto.codigoProducto);

    const producto = this.productoRepo.create({
      nombre: dto.nombre,
      codigoProducto: dto.codigoProducto,
      precioVenta: dto.precioVenta,
      porcentajeIva: dto.porcentajeIva,
      requiereReceta: dto.requiereReceta ? 'S' : 'N',
      principioActivo: dto.principioActivo ?? null,
      presentacion: dto.presentacion ?? null,
      concentracion: dto.concentracion ?? null,
      categoria: await this.resolveCategoria(dto.categoriaId),
      laboratorio: await this.resolveLaboratorio(dto.laboratorioId),
      unidadMedida: await this.resolveUnidadMedida(dto.unidadMedidaId),
    });

    return this.productoRepo.save(producto);
  }

  async findAll(query: QueryProductosDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.productoRepo
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .leftJoinAndSelect('producto.unidadMedida', 'unidadMedida')
      .orderBy('producto.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.q) {
      qb.andWhere(
        '(LOWER(producto.nombre) LIKE :q OR LOWER(producto.codigoProducto) LIKE :q)',
        { q: `%${query.q.toLowerCase()}%` },
      );
    }

    if (query.estado) {
      qb.andWhere('producto.estado = :estado', { estado: query.estado });
    }

    if (query.categoriaId) {
      qb.andWhere('categoria.categoriaId = :categoriaId', { categoriaId: query.categoriaId });
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(productoId: number): Promise<Producto> {
    const producto = await this.productoRepo.findOne({
      where: { productoId },
      relations: { categoria: true, laboratorio: true, unidadMedida: true },
    });

    if (!producto) {
      throw new NotFoundException(`No existe un producto con id ${productoId}.`);
    }

    return producto;
  }

  async update(productoId: number, dto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.findOne(productoId);

    if (dto.codigoProducto && dto.codigoProducto !== producto.codigoProducto) {
      await this.assertCodigoDisponible(dto.codigoProducto);
      producto.codigoProducto = dto.codigoProducto;
    }

    if (dto.nombre !== undefined) producto.nombre = dto.nombre;
    if (dto.precioVenta !== undefined) producto.precioVenta = dto.precioVenta;
    if (dto.porcentajeIva !== undefined) producto.porcentajeIva = dto.porcentajeIva;
    if (dto.requiereReceta !== undefined) producto.requiereReceta = dto.requiereReceta ? 'S' : 'N';
    if (dto.principioActivo !== undefined) producto.principioActivo = dto.principioActivo;
    if (dto.presentacion !== undefined) producto.presentacion = dto.presentacion;
    if (dto.concentracion !== undefined) producto.concentracion = dto.concentracion;

    if (dto.categoriaId !== undefined) {
      producto.categoria = await this.resolveCategoria(dto.categoriaId);
    }
    if (dto.laboratorioId !== undefined) {
      producto.laboratorio = await this.resolveLaboratorio(dto.laboratorioId);
    }
    if (dto.unidadMedidaId !== undefined) {
      producto.unidadMedida = await this.resolveUnidadMedida(dto.unidadMedidaId);
    }

    return this.productoRepo.save(producto);
  }

  async desactivar(productoId: number): Promise<Producto> {
    const producto = await this.findOne(productoId);
    producto.estado = 'INACTIVO';
    return this.productoRepo.save(producto);
  }

  async activar(productoId: number): Promise<Producto> {
    const producto = await this.findOne(productoId);
    producto.estado = 'ACTIVO';
    return this.productoRepo.save(producto);
  }

  private async assertCodigoDisponible(codigoProducto: string): Promise<void> {
    const existente = await this.productoRepo.findOne({ where: { codigoProducto } });
    if (existente) {
      throw new ConflictException(`Ya existe un producto con el código ${codigoProducto}.`);
    }
  }

  private async resolveCategoria(categoriaId?: number): Promise<CategoriaProducto | null> {
    if (categoriaId === undefined || categoriaId === null) return null;
    const categoria = await this.categoriaRepo.findOne({ where: { categoriaId } });
    if (!categoria) {
      throw new NotFoundException(`No existe una categoría con id ${categoriaId}.`);
    }
    return categoria;
  }

  private async resolveLaboratorio(laboratorioId?: number): Promise<Laboratorio | null> {
    if (laboratorioId === undefined || laboratorioId === null) return null;
    const laboratorio = await this.laboratorioRepo.findOne({ where: { laboratorioId } });
    if (!laboratorio) {
      throw new NotFoundException(`No existe un laboratorio con id ${laboratorioId}.`);
    }
    return laboratorio;
  }

  private async resolveUnidadMedida(unidadMedidaId?: number): Promise<UnidadMedida | null> {
    if (unidadMedidaId === undefined || unidadMedidaId === null) return null;
    const unidadMedida = await this.unidadMedidaRepo.findOne({ where: { unidadMedidaId } });
    if (!unidadMedida) {
      throw new NotFoundException(`No existe una unidad de medida con id ${unidadMedidaId}.`);
    }
    return unidadMedida;
  }
}
