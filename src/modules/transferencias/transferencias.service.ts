import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transferencia } from '../../database/entities/transferencia.entity';
import { TransferenciaDetalle } from '../../database/entities/transferencia-detalle.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Lote } from '../../database/entities/lote.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { MovimientoInventario } from '../../database/entities/movimiento-inventario.entity';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { EnviarTransferenciaDto } from './dto/enviar-transferencia.dto';
import { RecibirTransferenciaDto } from './dto/recibir-transferencia.dto';
import { QueryTransferenciasDto } from './dto/query-transferencias.dto';

@Injectable()
export class TransferenciasService {
  constructor(
    @InjectRepository(Transferencia)
    private readonly transferenciaRepo: Repository<Transferencia>,
    @InjectRepository(TransferenciaDetalle)
    private readonly detalleRepo: Repository<TransferenciaDetalle>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTransferenciaDto): Promise<Transferencia> {
    if (dto.sucursalOrigenId === dto.sucursalDestinoId) {
      throw new BadRequestException(
        'La sucursal de origen y la sucursal de destino no pueden ser la misma.',
      );
    }

    const sucursalOrigen = await this.sucursalRepo.findOne({
      where: { sucursalId: dto.sucursalOrigenId },
    });
    if (!sucursalOrigen) {
      throw new NotFoundException(
        `La sucursal de origen #${dto.sucursalOrigenId} no existe.`,
      );
    }

    if (sucursalOrigen.tipoSucursal !== 'BODEGA_CENTRAL') {
      throw new BadRequestException(
        `Toda solicitud de reabastecimiento debe dirigirse hacia un centro de distribución autorizado (Bodega Central). "${sucursalOrigen.nombre}" no es de tipo BODEGA_CENTRAL.`,
      );
    }

    const sucursalDestino = await this.sucursalRepo.findOne({
      where: { sucursalId: dto.sucursalDestinoId },
    });
    if (!sucursalDestino) {
      throw new NotFoundException(
        `La sucursal de destino #${dto.sucursalDestinoId} no existe.`,
      );
    }

    // Validar que los lotes existan y tengan existencias en Bodega Central
    for (const d of dto.detalles) {
      const lote = await this.loteRepo.findOne({
        where: { loteId: d.loteId },
        relations: { inventarios: true },
      });
      if (!lote) {
        throw new NotFoundException(`El lote #${d.loteId} no existe.`);
      }

      const invOrigen = (lote.inventarios ?? []).find(
        (i) => Number(i.sucursalId) === Number(dto.sucursalOrigenId),
      );
      const stockDisponible = invOrigen ? Number(invOrigen.cantidadDisponible) : 0;
      if (stockDisponible <= 0) {
        throw new BadRequestException(
          `El lote ${lote.numeroLote} no tiene existencias disponibles en ${sucursalOrigen.nombre}.`,
        );
      }
      if (Number(d.cantidadSolicitada) > stockDisponible) {
        throw new BadRequestException(
          `La cantidad solicitada (${d.cantidadSolicitada}) para el lote ${lote.numeroLote} supera las existencias en ${sucursalOrigen.nombre} (${stockDisponible} disponibles).`,
        );
      }
    }

    const resultId = await this.dataSource.transaction(async (manager) => {
      const transferencia = manager.create(Transferencia, {
        sucursalOrigen,
        sucursalDestino,
        fechaSolicitud: new Date(),
        estado: 'SOLICITADA',
        observacion: dto.observacion ?? null,
      });

      const guardada = await manager.save(transferencia);

      const detallesEntities = dto.detalles.map((d) =>
        manager.create(TransferenciaDetalle, {
          transferenciaId: guardada.transferenciaId,
          loteId: d.loteId,
          cantidadSolicitada: d.cantidadSolicitada,
          cantidadEnviada: 0,
          cantidadRecibida: 0,
        }),
      );

      await manager.save(detallesEntities);

      return guardada.transferenciaId;
    });

    return this.findOne(resultId);
  }

  async findAll(query: QueryTransferenciasDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.transferenciaRepo
      .createQueryBuilder('transferencia')
      .leftJoinAndSelect('transferencia.sucursalOrigen', 'sucursalOrigen')
      .leftJoinAndSelect('transferencia.sucursalDestino', 'sucursalDestino')
      .leftJoinAndSelect('transferencia.transferenciaDetalles', 'detalles')
      .leftJoinAndSelect('detalles.lote', 'lote')
      .leftJoinAndSelect('lote.producto', 'producto')
      .orderBy('transferencia.fechaSolicitud', 'DESC')
      .addOrderBy('transferencia.transferenciaId', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.estado) {
      qb.andWhere('transferencia.estado = :estado', { estado: query.estado });
    }

    if (query.sucursalOrigenId) {
      qb.andWhere('sucursalOrigen.sucursalId = :origenId', {
        origenId: query.sucursalOrigenId,
      });
    }

    if (query.sucursalDestinoId) {
      qb.andWhere('sucursalDestino.sucursalId = :destinoId', {
        destinoId: query.sucursalDestinoId,
      });
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Transferencia> {
    const transferencia = await this.transferenciaRepo.findOne({
      where: { transferenciaId: id },
      relations: {
        sucursalOrigen: true,
        sucursalDestino: true,
        transferenciaDetalles: {
          lote: {
            producto: true,
          },
        },
      },
    });

    if (!transferencia) {
      throw new NotFoundException(`No existe una transferencia con ID #${id}.`);
    }

    return transferencia;
  }

  async enviar(id: number, dto: EnviarTransferenciaDto): Promise<Transferencia> {
    const transferencia = await this.findOne(id);

    if (transferencia.estado !== 'SOLICITADA') {
      throw new BadRequestException(
        `Solo se pueden enviar transferencias en estado SOLICITADA. Estado actual: ${transferencia.estado}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      for (const det of transferencia.transferenciaDetalles) {
        let cantidadAEnviar = Number(det.cantidadSolicitada);

        if (dto.detalles && dto.detalles.length > 0) {
          const itemDto = dto.detalles.find((d) => d.loteId === det.loteId);
          if (itemDto) {
            cantidadAEnviar = Number(itemDto.cantidadEnviada);
          }
        }

        if (cantidadAEnviar <= 0) {
          throw new BadRequestException(
            `La cantidad a enviar del lote ${det.lote.numeroLote} debe ser mayor a cero.`,
          );
        }

        // Verificar inventario en la sucursal de origen
        const inventarioOrigen = await manager.findOne(Inventario, {
          where: {
            sucursalId: transferencia.sucursalOrigen.sucursalId,
            loteId: det.loteId,
          },
        });

        if (
          !inventarioOrigen ||
          Number(inventarioOrigen.cantidadDisponible) < cantidadAEnviar
        ) {
          throw new BadRequestException(
            `Stock insuficiente en sucursal origen (${transferencia.sucursalOrigen.nombre}) para el lote ${det.lote.numeroLote}. Disponible: ${inventarioOrigen?.cantidadDisponible ?? 0}, Solicitado a enviar: ${cantidadAEnviar}.`,
          );
        }

        // Descontar inventario de la sucursal de origen
        const cantidadAnterior = Number(inventarioOrigen.cantidadDisponible);
        const cantidadNueva = cantidadAnterior - cantidadAEnviar;

        inventarioOrigen.cantidadDisponible = cantidadNueva;
        inventarioOrigen.fechaActualizacion = new Date();
        const invGuardado = await manager.save(inventarioOrigen);

        // Registrar movimiento en el Kardex de origen (SALIDA)
        const movimiento = manager.create(MovimientoInventario, {
          tipoMovimiento: 'TRANSFERENCIA_SALIDA',
          referenciaTipo: 'TRANSFERENCIA_ENVIO',
          referenciaId: transferencia.transferenciaId,
          observacion: `Despacho de transferencia #${transferencia.transferenciaId} hacia sucursal ${transferencia.sucursalDestino.nombre}`,
          cantidadAnterior,
          cantidad: cantidadAEnviar,
          cantidadNueva,
          inventario: invGuardado,
        });
        await manager.save(movimiento);

        // Actualizar detalle con la cantidad enviada
        det.cantidadEnviada = cantidadAEnviar;
        await manager.save(det);
      }

      transferencia.fechaEnvio = new Date();
      transferencia.estado = 'EN_TRANSITO';
      if (dto.observacion) {
        transferencia.observacion = transferencia.observacion
          ? `${transferencia.observacion} | Envío: ${dto.observacion}`
          : dto.observacion;
      }

      await manager.save(transferencia);
    });

    return this.findOne(transferencia.transferenciaId);
  }

  async recibir(id: number, dto: RecibirTransferenciaDto): Promise<Transferencia> {
    const transferencia = await this.findOne(id);

    if (transferencia.estado !== 'EN_TRANSITO') {
      throw new BadRequestException(
        `Solo se pueden recibir transferencias en estado EN_TRANSITO. Estado actual: ${transferencia.estado}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      for (const det of transferencia.transferenciaDetalles) {
        let cantidadARecibir = Number(det.cantidadEnviada);

        if (dto.detalles && dto.detalles.length > 0) {
          const itemDto = dto.detalles.find((d) => d.loteId === det.loteId);
          if (itemDto) {
            cantidadARecibir = Number(itemDto.cantidadRecibida);
          }
        }

        if (cantidadARecibir < 0) {
          throw new BadRequestException(
            `La cantidad recibida del lote ${det.lote.numeroLote} no puede ser negativa.`,
          );
        }

        // Buscar o crear registro en INVENTARIO en la sucursal de destino
        let inventarioDestino = await manager.findOne(Inventario, {
          where: {
            sucursalId: transferencia.sucursalDestino.sucursalId,
            loteId: det.loteId,
          },
        });

        if (!inventarioDestino) {
          inventarioDestino = manager.create(Inventario, {
            sucursalId: transferencia.sucursalDestino.sucursalId,
            loteId: det.loteId,
            cantidadDisponible: 0,
            cantidadReservada: 0,
            stockMinimo: 5,
            stockMaximo: 100,
            fechaActualizacion: new Date(),
          });
        }

        const cantidadAnterior = Number(inventarioDestino.cantidadDisponible);
        const cantidadNueva = cantidadAnterior + cantidadARecibir;

        inventarioDestino.cantidadDisponible = cantidadNueva;
        inventarioDestino.fechaActualizacion = new Date();
        const invGuardado = await manager.save(inventarioDestino);

        // Registrar movimiento en el Kardex de destino (ENTRADA)
        const movimiento = manager.create(MovimientoInventario, {
          tipoMovimiento: 'TRANSFERENCIA_ENTRADA',
          referenciaTipo: 'TRANSFERENCIA_RECEPCION',
          referenciaId: transferencia.transferenciaId,
          observacion: `Recepción de transferencia #${transferencia.transferenciaId} desde sucursal ${transferencia.sucursalOrigen.nombre}`,
          cantidadAnterior,
          cantidad: cantidadARecibir,
          cantidadNueva,
          inventario: invGuardado,
        });
        await manager.save(movimiento);

        // Actualizar detalle con la cantidad recibida
        det.cantidadRecibida = cantidadARecibir;
        await manager.save(det);
      }

      transferencia.fechaRecepcion = new Date();
      transferencia.estado = 'RECIBIDA';
      if (dto.observacion) {
        transferencia.observacion = transferencia.observacion
          ? `${transferencia.observacion} | Recepción: ${dto.observacion}`
          : dto.observacion;
      }

      await manager.save(transferencia);
    });

    return this.findOne(transferencia.transferenciaId);
  }

  async cancelar(id: number, observacion?: string): Promise<Transferencia> {
    const transferencia = await this.findOne(id);

    if (
      transferencia.estado === 'RECIBIDA' ||
      transferencia.estado === 'CANCELADA'
    ) {
      throw new BadRequestException(
        `No se puede cancelar una transferencia que ya está ${transferencia.estado}.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // Si ya estaba en tránsito, reintegrar existencias a la sucursal de origen
      if (transferencia.estado === 'EN_TRANSITO') {
        for (const det of transferencia.transferenciaDetalles) {
          const cantidadAReintegrar = Number(det.cantidadEnviada);
          if (cantidadAReintegrar > 0) {
            const inventarioOrigen = await manager.findOne(Inventario, {
              where: {
                sucursalId: transferencia.sucursalOrigen.sucursalId,
                loteId: det.loteId,
              },
            });

            if (inventarioOrigen) {
              const cantidadAnterior = Number(inventarioOrigen.cantidadDisponible);
              const cantidadNueva = cantidadAnterior + cantidadAReintegrar;
              inventarioOrigen.cantidadDisponible = cantidadNueva;
              inventarioOrigen.fechaActualizacion = new Date();
              const invGuardado = await manager.save(inventarioOrigen);

              const movimiento = manager.create(MovimientoInventario, {
                tipoMovimiento: 'TRANSFERENCIA_ENTRADA',
                referenciaTipo: 'TRANSFERENCIA_CANCELACION',
                referenciaId: transferencia.transferenciaId,
                observacion: `Reversión por cancelación de transferencia #${transferencia.transferenciaId}`,
                cantidadAnterior,
                cantidad: cantidadAReintegrar,
                cantidadNueva,
                inventario: invGuardado,
              });
              await manager.save(movimiento);
            }
          }
        }
      }

      transferencia.estado = 'CANCELADA';
      if (observacion) {
        transferencia.observacion = transferencia.observacion
          ? `${transferencia.observacion} | Cancelación: ${observacion}`
          : observacion;
      }

      await manager.save(transferencia);
    });

    return this.findOne(transferencia.transferenciaId);
  }
}
