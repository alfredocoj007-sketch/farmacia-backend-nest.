import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Lote } from '../../database/entities/lote.entity';
import { Producto } from '../../database/entities/producto.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { MovimientoInventario } from '../../database/entities/movimiento-inventario.entity';
import { CreateEntradaLoteDto } from './dto/create-entrada-lote.dto';
import { CreateSalidaLoteDto } from './dto/create-salida-lote.dto';
import { QueryLotesDto } from './dto/query-lotes.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class LotesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,

    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,

    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
  ) {}

  async registrarEntrada(dto: CreateEntradaLoteDto) {
    const producto = await this.productoRepo.findOne({ where: { productoId: dto.productoId } });
    if (!producto) {
      throw new NotFoundException(`No existe un producto con id ${dto.productoId}.`);
    }
    if (producto.estado !== 'ACTIVO') {
      throw new BadRequestException(`El producto "${producto.nombre}" está inactivo, no se le puede registrar entrada.`);
    }

    const sucursal = await this.sucursalRepo.findOne({ where: { sucursalId: dto.sucursalId } });
    if (!sucursal) {
      throw new NotFoundException(`No existe una sucursal con id ${dto.sucursalId}.`);
    }

    return this.dataSource.transaction(async (manager) => {
      let lote = await manager.findOne(Lote, {
        where: { productoId: dto.productoId, numeroLote: dto.numeroLote },
      });

      if (!lote) {
        lote = manager.create(Lote, {
          productoId: dto.productoId,
          numeroLote: dto.numeroLote,
          fechaVencimiento: new Date(dto.fechaVencimiento),
          fechaFabricacion: dto.fechaFabricacion ? new Date(dto.fechaFabricacion) : null,
          costoUnitario: dto.costoUnitario,
        });
        lote = await manager.save(lote);
      }

      let inventario = await manager.findOne(Inventario, {
        where: { sucursalId: dto.sucursalId, loteId: lote.loteId },
      });

      const cantidadAnterior = inventario?.cantidadDisponible ?? 0;
      const cantidadNueva = Number(cantidadAnterior) + Number(dto.cantidad);

      if (!inventario) {
        inventario = manager.create(Inventario, {
          sucursalId: dto.sucursalId,
          loteId: lote.loteId,
          cantidadDisponible: cantidadNueva,
          fechaActualizacion: new Date(),
        });
      } else {
        inventario.cantidadDisponible = cantidadNueva;
        inventario.fechaActualizacion = new Date();
      }
      inventario = await manager.save(inventario);

      const movimiento = manager.create(MovimientoInventario, {
        tipoMovimiento: 'ENTRADA',
        referenciaTipo: 'COMPRA',
        referenciaId: lote.loteId,
        observacion: dto.observacion ?? null,
        cantidadAnterior,
        cantidad: dto.cantidad,
        cantidadNueva,
        inventario,
      });
      const movimientoGuardado = await manager.save(movimiento);

      return { lote, inventario, movimiento: movimientoGuardado };
    });
  }

  async registrarSalida(dto: CreateSalidaLoteDto, user: AuthenticatedUser) {
    if (dto.tipoMovimiento === 'AJUSTE' && user.rolNombre !== 'ADMIN') {
      throw new ForbiddenException('Solo un ADMIN puede registrar ajustes de inventario.');
    }

    const producto = await this.productoRepo.findOne({ where: { productoId: dto.productoId } });
    if (!producto) {
      throw new NotFoundException(`No existe un producto con id ${dto.productoId}.`);
    }

    const sucursal = await this.sucursalRepo.findOne({ where: { sucursalId: dto.sucursalId } });
    if (!sucursal) {
      throw new NotFoundException(`No existe una sucursal con id ${dto.sucursalId}.`);
    }

    return this.dataSource.transaction(async (manager) => {
      const movimientos: MovimientoInventario[] = [];

      if (dto.loteId) {
        const lote = await manager.findOne(Lote, { where: { loteId: dto.loteId } });
        if (!lote) {
          throw new NotFoundException(`No existe un lote con id ${dto.loteId}.`);
        }
        if (lote.productoId !== dto.productoId) {
          throw new BadRequestException(
            `El lote ${dto.loteId} no pertenece al producto ${dto.productoId}.`,
          );
        }

        const inventario = await manager.findOne(Inventario, {
          where: { sucursalId: dto.sucursalId, loteId: dto.loteId },
        });

        if (!inventario || Number(inventario.cantidadDisponible) < dto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente en el lote ${lote.numeroLote} (disponible: ${inventario?.cantidadDisponible ?? 0}, solicitado: ${dto.cantidad}).`,
          );
        }

        movimientos.push(
          await this.aplicarSalida(manager, inventario, dto.cantidad, dto.tipoMovimiento, lote.loteId, dto.observacion),
        );
      } else {
        const inventarios = await manager
          .createQueryBuilder(Inventario, 'inventario')
          .innerJoinAndSelect('inventario.lote', 'lote')
          .where('lote.productoId = :productoId', { productoId: dto.productoId })
          .andWhere('inventario.sucursalId = :sucursalId', { sucursalId: dto.sucursalId })
          .andWhere('inventario.cantidadDisponible > 0')
          .orderBy('lote.fechaVencimiento', 'ASC')
          .getMany();

        const totalDisponible = inventarios.reduce(
          (sum, inv) => sum + Number(inv.cantidadDisponible),
          0,
        );

        if (totalDisponible < dto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente: se solicitaron ${dto.cantidad} y solo hay ${totalDisponible} disponibles en total para este producto en esta sucursal.`,
          );
        }

        let restante = dto.cantidad;
        for (const inventario of inventarios) {
          if (restante <= 0) break;
          const aConsumir = Math.min(restante, Number(inventario.cantidadDisponible));
          movimientos.push(
            await this.aplicarSalida(
              manager,
              inventario,
              aConsumir,
              dto.tipoMovimiento,
              inventario.lote.loteId,
              dto.observacion,
            ),
          );
          restante -= aConsumir;
        }
      }

      return movimientos;
    });
  }

  private async aplicarSalida(
    manager: EntityManager,
    inventario: Inventario,
    cantidad: number,
    tipoMovimiento: 'VENTA' | 'AJUSTE',
    loteId: number,
    observacion?: string,
  ): Promise<MovimientoInventario> {
    const cantidadAnterior = Number(inventario.cantidadDisponible);
    const cantidadNueva = cantidadAnterior - cantidad;

    inventario.cantidadDisponible = cantidadNueva;
    inventario.fechaActualizacion = new Date();
    const inventarioGuardado = await manager.save(inventario);

    const movimiento = manager.create(MovimientoInventario, {
      tipoMovimiento,
      referenciaTipo: tipoMovimiento,
      referenciaId: loteId,
      observacion: observacion ?? null,
      cantidadAnterior,
      cantidad,
      cantidadNueva,
      inventario: inventarioGuardado,
    });

    return manager.save(movimiento);
  }

  async findAll(query: QueryLotesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.loteRepo
      .createQueryBuilder('lote')
      .leftJoinAndSelect('lote.producto', 'producto')
      .leftJoinAndSelect('lote.inventarios', 'inventario')
      .leftJoinAndSelect('inventario.sucursal', 'sucursal')
      .orderBy('lote.fechaVencimiento', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.productoId) {
      qb.andWhere('lote.productoId = :productoId', { productoId: query.productoId });
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(loteId: number): Promise<Lote> {
    const lote = await this.loteRepo.findOne({
      where: { loteId },
      relations: {
        producto: true,
        inventarios: { sucursal: true },
      },
    });

    if (!lote) {
      throw new NotFoundException(`No existe un lote con id ${loteId}.`);
    }

    return lote;
  }

  async findMovimientos(loteId: number): Promise<MovimientoInventario[]> {
    await this.findOne(loteId);

    return this.dataSource
      .getRepository(MovimientoInventario)
      .createQueryBuilder('movimiento')
      .innerJoin('movimiento.inventario', 'inventario')
      .leftJoinAndSelect('movimiento.inventario', 'inventarioSelect')
      .leftJoinAndSelect('inventarioSelect.sucursal', 'sucursal')
      .where('inventario.loteId = :loteId', { loteId })
      .orderBy('movimiento.fechaMovimiento', 'ASC')
      .getMany();
  }
}
