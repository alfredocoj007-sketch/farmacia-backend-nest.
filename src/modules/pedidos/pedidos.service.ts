import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from '../../database/entities/pedido.entity';
import { PedidoDetalle } from '../../database/entities/pedido-detalle.entity';
import { Entrega } from '../../database/entities/entrega.entity';
import { Cliente } from '../../database/entities/cliente.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Producto } from '../../database/entities/producto.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { Lote } from '../../database/entities/lote.entity';
import { Municipio } from '../../database/entities/municipio.entity';
import {
  CreatePedidoCallCenterDto,
  ItemPedidoCallCenterDto,
} from './dto/create-pedido-callcenter.dto';
import { CambiarEstadoPedidoDto } from './dto/cambiar-estado-pedido.dto';
import { QueryPedidosDto } from './dto/query-pedidos.dto';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto';

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  constructor(
    @InjectRepository(Pedido)
    private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(PedidoDetalle)
    private readonly pedidoDetalleRepo: Repository<PedidoDetalle>,
    @InjectRepository(Entrega)
    private readonly entregaRepo: Repository<Entrega>,
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(MetodoPago)
    private readonly metodoPagoRepo: Repository<MetodoPago>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
  ) {}

  /**
   * Auto-sembrado de clientes de prueba para atención inmediata en el Call Center.
   */
  private async autoSeedClientesSiEstaVacio(): Promise<void> {
    const total = await this.clienteRepo.count();
    if (total > 0) return;

    const sucursal = await this.sucursalRepo.findOne({ where: { sucursalId: 1 }, relations: { municipio: true } });
    const municipio = sucursal?.municipio || null;

    const clientesSeed = [
      {
        nombre: 'Carlos',
        apellido: 'Mendoza Gómez',
        telefono: '5544-3322',
        direccion: '14 Calle 3-45, Zona 10, Edificio Dubai Center, Apto 502',
        referenciaDireccion: 'Frente a Plaza Fontabella, portón negro con garita',
        email: 'carlos.mendoza@gmail.com',
        estado: 'ACTIVO',
        municipio,
      },
      {
        nombre: 'María Elena',
        apellido: 'Vásquez de León',
        telefono: '4411-9988',
        direccion: 'Calzada Roosevelt 15-20, Zona 11, Colonia Mariscal',
        referenciaDireccion: 'A 2 cuadras de C.C. Miraflores, casa verde de 2 niveles',
        email: 'mevasquez@hotmail.com',
        estado: 'ACTIVO',
        municipio,
      },
      {
        nombre: 'Dr. Roberto',
        apellido: 'Pineda Morales',
        telefono: '5123-7744',
        direccion: '6a Avenida 7-30, Zona 1, Centro Histórico',
        referenciaDireccion: 'Clínica Médica Familiar, junto a Farmacia Central',
        email: 'dr.pineda@medicosgt.com',
        estado: 'ACTIVO',
        municipio,
      },
    ];

    for (const c of clientesSeed) {
      const nuevo = this.clienteRepo.create(c as any);
      await this.clienteRepo.save(nuevo);
    }

    this.logger.log(`Auto-seeded ${clientesSeed.length} clientes para el Call Center`);
  }

  /**
   * Búsqueda ágil de cliente por teléfono o nombre para el operador del Call Center.
   */
  async buscarClientes(termino: string) {
    await this.autoSeedClientesSiEstaVacio();
    const term = `%${termino.trim().toUpperCase()}%`;

    return this.clienteRepo
      .createQueryBuilder('cliente')
      .leftJoinAndSelect('cliente.municipio', 'municipio')
      .where('UPPER(cliente.telefono) LIKE :term OR UPPER(cliente.nombre) LIKE :term OR UPPER(cliente.apellido) LIKE :term', { term })
      .orderBy('cliente.clienteId', 'DESC')
      .take(10)
      .getMany();
  }

  /**
   * Consulta en tiempo real de disponibilidad por farmacia (Mall, Stand Gasolinera, Central).
   * Determina qué sucursal puede despachar completo para evitar entregas tardías.
   */
  async consultarDisponibilidad(dto: ConsultarDisponibilidadDto) {
    const sucursales = await this.sucursalRepo.find({
      where: { estado: 'ACTIVA' },
      order: { sucursalId: 'ASC' },
    });

    const resultados = [];

    for (const suc of sucursales) {
      let puedeEntregarCompleto = true;
      const itemsDisponibilidad = [];

      for (const item of dto.items) {
        const prod = await this.productoRepo.findOne({ where: { productoId: item.productoId } });
        if (!prod) continue;

        // Sumar existencias disponibles en inventario de esta sucursal para este producto
        const inventarios = await this.inventarioRepo
          .createQueryBuilder('inv')
          .innerJoin('inv.lote', 'lote')
          .where('inv.sucursalId = :sucId', { sucId: suc.sucursalId })
          .andWhere('lote.productoId = :prodId', { prodId: item.productoId })
          .andWhere('inv.cantidadDisponible > 0')
          .getMany();

        const stockDisponible = inventarios.reduce(
          (sum, inv) => sum + Number(inv.cantidadDisponible),
          0,
        );

        const cumple = stockDisponible >= item.cantidad;
        if (!cumple) {
          puedeEntregarCompleto = false;
        }

        itemsDisponibilidad.push({
          productoId: prod.productoId,
          nombre: prod.nombre,
          requiereReceta: prod.requiereReceta,
          precioVenta: Number(prod.precioVenta),
          cantidadSolicitada: item.cantidad,
          stockDisponibleEnSucursal: stockDisponible,
          disponibilidad: cumple ? 'COMPLETO' : stockDisponible > 0 ? 'PARCIAL' : 'SIN_STOCK',
        });
      }

      resultados.push({
        sucursalId: suc.sucursalId,
        nombre: suc.nombre,
        tipoSucursal: suc.tipoSucursal,
        direccion: suc.direccion,
        telefono: suc.telefono,
        puedeEntregarCompleto,
        tiempoEstimadoMinutos:
          suc.tipoSucursal === 'GAS_STAND' ? '25 - 35 min (Stand Exprés)' :
          suc.tipoSucursal === 'MALL_STAND' ? '30 - 45 min (Isla Comercial)' : '45 - 60 min (Central)',
        items: itemsDisponibilidad,
      });
    }

    // Ordenar primero las sucursales que pueden entregar 100% de la orden
    return resultados.sort((a, b) => (b.puedeEntregarCompleto ? 1 : 0) - (a.puedeEntregarCompleto ? 1 : 0));
  }

  /**
   * Registra una orden tomada en el Call Center, coordinando la entrega con la farmacia seleccionada.
   */
  async crearPedidoCallCenter(dto: CreatePedidoCallCenterDto, usuario: any) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El pedido debe incluir al menos un medicamento.');
    }

    // 1. Resolver o Crear Cliente
    let cliente: Cliente | null = null;
    if (dto.clienteId) {
      cliente = await this.clienteRepo.findOne({ where: { clienteId: dto.clienteId } });
    } else if (dto.nuevoCliente) {
      const existente = await this.clienteRepo.findOne({
        where: { telefono: dto.nuevoCliente.telefono.trim() },
      });
      if (existente) {
        existente.nombre = dto.nuevoCliente.nombre.trim();
        existente.apellido = dto.nuevoCliente.apellido?.trim() || existente.apellido;
        existente.direccion = dto.nuevoCliente.direccion.trim();
        existente.referenciaDireccion = dto.nuevoCliente.referenciaDireccion?.trim() || existente.referenciaDireccion;
        cliente = await this.clienteRepo.save(existente);
      } else {
        const municipio =
          (await this.clienteRepo.manager.findOne(Municipio, {
            where: {},
          })) || undefined;
        const nuevo = this.clienteRepo.create({
          nombre: dto.nuevoCliente.nombre.trim(),
          apellido: dto.nuevoCliente.apellido?.trim() || null,
          telefono: dto.nuevoCliente.telefono.trim(),
          direccion: dto.nuevoCliente.direccion.trim(),
          referenciaDireccion: dto.nuevoCliente.referenciaDireccion?.trim() || null,
          email: dto.nuevoCliente.email?.trim() || null,
          estado: 'ACTIVO',
          municipio,
        });
        cliente = await this.clienteRepo.save(nuevo);
      }
    }

    if (!cliente) {
      throw new BadRequestException('Debe proporcionar los datos del cliente para coordinar la entrega.');
    }

    // 2. Validar Sucursal de Preparación
    const sucursal = await this.sucursalRepo.findOne({
      where: { sucursalId: dto.sucursalPreparacionId, estado: 'ACTIVA' },
    });
    if (!sucursal) {
      throw new NotFoundException(`Sucursal de preparación #${dto.sucursalPreparacionId} no encontrada o inactiva.`);
    }

    // 3. Validar Método de Pago
    const metodoPago = await this.metodoPagoRepo.findOne({
      where: { metodoPagoId: dto.metodoPagoId, estado: 'ACTIVO' },
    });
    if (!metodoPago) {
      throw new NotFoundException(`Método de pago #${dto.metodoPagoId} no válido.`);
    }

    // 4. Procesar Medicamentos y Validación de Stock en la Sucursal
    let totalPedido = 0;
    const detallesAguardar: {
      producto: Producto;
      lote: Lote | null;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      inventarioAfectar?: Inventario;
    }[] = [];

    for (const item of dto.items) {
      const producto = await this.productoRepo.findOne({ where: { productoId: item.productoId } });
      if (!producto) {
        throw new NotFoundException(`Medicamento #${item.productoId} no encontrado.`);
      }

      // Buscar lote disponible bajo FEFO en la sucursal asignada
      const inventarios = await this.inventarioRepo
        .createQueryBuilder('inv')
        .innerJoinAndSelect('inv.lote', 'lote')
        .where('inv.sucursalId = :sucId', { sucId: sucursal.sucursalId })
        .andWhere('lote.productoId = :prodId', { prodId: producto.productoId })
        .andWhere('inv.cantidadDisponible >= :qty', { qty: item.cantidad })
        .orderBy('lote.fechaVencimiento', 'ASC')
        .getMany();

      const invSeleccionado = inventarios.length > 0 ? inventarios[0] : null;
      const precioUnitario = Number(producto.precioVenta);
      const subtotal = Number((precioUnitario * item.cantidad).toFixed(2));
      totalPedido += subtotal;

      detallesAguardar.push({
        producto,
        lote: invSeleccionado?.lote || null,
        cantidad: item.cantidad,
        precioUnitario,
        subtotal,
        inventarioAfectar: invSeleccionado || undefined,
      });
    }

    // 5. Crear Entidad PEDIDO
    const nuevoPedido = this.pedidoRepo.create({
      cliente,
      sucursalPreparacion: sucursal,
      metodoPago,
      total: Number(totalPedido.toFixed(2)),
      origen: dto.origen || 'CALL_CENTER',
      fechaPedido: new Date(),
      fechaEstimadaEntrega: new Date(dto.fechaEstimadaEntrega),
      estado: 'RECIBIDO',
      observacion: dto.observacion?.trim() || null,
    });
    const pedidoGuardado = await this.pedidoRepo.save(nuevoPedido);

    // 6. Guardar Detalles de Pedido
    for (const det of detallesAguardar) {
      const detalleEntidad = this.pedidoDetalleRepo.create({
        pedido: pedidoGuardado,
        producto: det.producto,
        lote: det.lote || undefined,
        cantidad: det.cantidad,
        precioUnitario: det.precioUnitario,
        subtotal: det.subtotal,
      });
      await this.pedidoDetalleRepo.save(detalleEntidad);

      // Descontar inventario disponible si se identificó el registro
      if (det.inventarioAfectar) {
        det.inventarioAfectar.cantidadDisponible = Math.max(
          0,
          Number(det.inventarioAfectar.cantidadDisponible) - det.cantidad,
        );
        det.inventarioAfectar.cantidadReservada =
          Number(det.inventarioAfectar.cantidadReservada || 0) + det.cantidad;
        det.inventarioAfectar.fechaActualizacion = new Date();
        await this.inventarioRepo.save(det.inventarioAfectar);
      }
    }

    // 7. Generar Registro Logístico de ENTREGA a Domicilio
    const nuevaEntrega = this.entregaRepo.create({
      pedido: pedidoGuardado,
      sucursal,
      personaRecibe: dto.personaRecibe?.trim() || `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      fechaProgramada: new Date(dto.fechaEstimadaEntrega),
      estado: 'PENDIENTE',
      observacion: dto.observacion?.trim() || `Despacho a domicilio desde ${sucursal.nombre}`,
    });
    await this.entregaRepo.save(nuevaEntrega);

    this.logger.log(
      `Pedido Call Center #${pedidoGuardado.pedidoId} creado exitosamente para ${cliente.nombre}. Preparación: ${sucursal.nombre}. Total: Q${totalPedido}`,
    );

    return this.obtenerPedidoPorId(pedidoGuardado.pedidoId);
  }

  /**
   * Listado de pedidos coordinados en el Call Center con filtros avanzados.
   */
  async listarPedidos(query: QueryPedidosDto) {
    await this.autoSeedClientesSiEstaVacio();

    const qb = this.pedidoRepo
      .createQueryBuilder('pedido')
      .leftJoinAndSelect('pedido.cliente', 'cliente')
      .leftJoinAndSelect('pedido.sucursalPreparacion', 'sucursal')
      .leftJoinAndSelect('pedido.metodoPago', 'metodoPago')
      .leftJoinAndSelect('pedido.entrega', 'entrega')
      .leftJoinAndSelect('pedido.pedidoDetalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .orderBy('pedido.pedidoId', 'DESC');

    if (query.estado) {
      qb.andWhere('pedido.estado = :estado', { estado: query.estado });
    }

    if (query.sucursalId) {
      qb.andWhere('sucursal.sucursalId = :sucId', { sucId: query.sucursalId });
    }

    if (query.busqueda) {
      const term = `%${query.busqueda.trim().toUpperCase()}%`;
      qb.andWhere(
        '(UPPER(cliente.nombre) LIKE :term OR UPPER(cliente.telefono) LIKE :term OR UPPER(cliente.direccion) LIKE :term OR CAST(pedido.pedidoId AS VARCHAR2(20)) LIKE :term)',
        { term },
      );
    }

    const limit = query.limit || 50;
    qb.take(limit);

    const items = await qb.getMany();

    return items.map((p) => ({
      pedidoId: p.pedidoId,
      origen: p.origen,
      estado: p.estado,
      total: Number(p.total),
      fechaPedido: p.fechaPedido,
      fechaEstimadaEntrega: p.fechaEstimadaEntrega,
      fechaConfirmacion: p.fechaConfirmacion,
      observacion: p.observacion,
      cliente: p.cliente
        ? {
            clienteId: p.cliente.clienteId,
            nombre: `${p.cliente.nombre} ${p.cliente.apellido || ''}`.trim(),
            telefono: p.cliente.telefono,
            direccion: p.cliente.direccion,
            referenciaDireccion: p.cliente.referenciaDireccion,
          }
        : null,
      sucursalPreparacion: p.sucursalPreparacion
        ? {
            sucursalId: p.sucursalPreparacion.sucursalId,
            nombre: p.sucursalPreparacion.nombre,
            tipoSucursal: p.sucursalPreparacion.tipoSucursal,
            direccion: p.sucursalPreparacion.direccion,
            telefono: p.sucursalPreparacion.telefono,
          }
        : null,
      metodoPago: p.metodoPago?.nombre || 'NO ESPECIFICADO',
      entrega: p.entrega
        ? {
            entregaId: p.entrega.entregaId,
            estado: p.entrega.estado,
            personaRecibe: p.entrega.personaRecibe,
            fechaProgramada: p.entrega.fechaProgramada,
            fechaSalida: p.entrega.fechaSalida,
            fechaEntrega: p.entrega.fechaEntrega,
          }
        : null,
      totalItems: p.pedidoDetalles?.length || 0,
      detalles: (p.pedidoDetalles || []).map((d) => ({
        pedidoDetalleId: d.pedidoDetalleId,
        productoNombre: d.producto?.nombre,
        principioActivo: d.producto?.principioActivo,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
      })),
    }));
  }

  /**
   * Obtiene la ficha completa de un pedido y su trazabilidad logística de entrega.
   */
  async obtenerPedidoPorId(pedidoId: number) {
    const p = await this.pedidoRepo.findOne({
      where: { pedidoId },
      relations: {
        cliente: true,
        sucursalPreparacion: true,
        metodoPago: true,
        entrega: true,
        pedidoDetalles: {
          producto: true,
          lote: true,
        },
      },
    });

    if (!p) {
      throw new NotFoundException(`Pedido #${pedidoId} no encontrado.`);
    }

    return {
      pedidoId: p.pedidoId,
      origen: p.origen,
      estado: p.estado,
      total: Number(p.total),
      fechaPedido: p.fechaPedido,
      fechaEstimadaEntrega: p.fechaEstimadaEntrega,
      fechaConfirmacion: p.fechaConfirmacion,
      observacion: p.observacion,
      cliente: p.cliente
        ? {
            clienteId: p.cliente.clienteId,
            nombre: `${p.cliente.nombre} ${p.cliente.apellido || ''}`.trim(),
            telefono: p.cliente.telefono,
            direccion: p.cliente.direccion,
            referenciaDireccion: p.cliente.referenciaDireccion,
          }
        : null,
      sucursalPreparacion: p.sucursalPreparacion
        ? {
            sucursalId: p.sucursalPreparacion.sucursalId,
            nombre: p.sucursalPreparacion.nombre,
            tipoSucursal: p.sucursalPreparacion.tipoSucursal,
            direccion: p.sucursalPreparacion.direccion,
            telefono: p.sucursalPreparacion.telefono,
          }
        : null,
      metodoPago: p.metodoPago?.nombre || 'NO ESPECIFICADO',
      entrega: p.entrega
        ? {
            entregaId: p.entrega.entregaId,
            estado: p.entrega.estado,
            personaRecibe: p.entrega.personaRecibe,
            fechaProgramada: p.entrega.fechaProgramada,
            fechaSalida: p.entrega.fechaSalida,
            fechaEntrega: p.entrega.fechaEntrega,
            observacion: p.entrega.observacion,
          }
        : null,
      detalles: (p.pedidoDetalles || []).map((d) => ({
        pedidoDetalleId: d.pedidoDetalleId,
        productoId: d.producto?.productoId,
        productoNombre: d.producto?.nombre,
        principioActivo: d.producto?.principioActivo,
        requiereReceta: d.producto?.requiereReceta,
        loteNumero: d.lote?.numeroLote || 'ASIGNACIÓN AUTOMÁTICA FEFO',
        fechaVencimiento: d.lote?.fechaVencimiento || null,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
      })),
    };
  }

  /**
   * Actualiza el estado del pedido y sincroniza la guía de entrega a domicilio.
   */
  async actualizarEstadoPedido(pedidoId: number, dto: CambiarEstadoPedidoDto) {
    const pedido = await this.pedidoRepo.findOne({
      where: { pedidoId },
      relations: { entrega: true, sucursalPreparacion: true },
    });
    if (!pedido) {
      throw new NotFoundException(`Pedido #${pedidoId} no encontrado.`);
    }

    const estadoAnterior = pedido.estado;
    pedido.estado = dto.estado;
    if (dto.observacion) {
      pedido.observacion = dto.observacion.trim();
    }

    const ahora = new Date();

    if (dto.estado === 'EN_PREPARACION') {
      pedido.fechaConfirmacion = ahora;
      if (pedido.entrega) {
        pedido.entrega.estado = 'PENDIENTE';
      }
    } else if (dto.estado === 'EN_RUTA') {
      if (pedido.entrega) {
        pedido.entrega.estado = 'EN_RUTA';
        pedido.entrega.fechaSalida = ahora;
      }
    } else if (dto.estado === 'ENTREGADO') {
      if (pedido.entrega) {
        pedido.entrega.estado = 'ENTREGADA';
        pedido.entrega.fechaEntrega = ahora;
        if (dto.personaRecibe) {
          pedido.entrega.personaRecibe = dto.personaRecibe.trim();
        }
      }
    } else if (dto.estado === 'CANCELADO') {
      if (pedido.entrega) {
        pedido.entrega.estado = 'FALLIDA';
      }
    }

    if (pedido.entrega) {
      await this.entregaRepo.save(pedido.entrega);
    }
    await this.pedidoRepo.save(pedido);

    this.logger.log(`Pedido #${pedido.pedidoId} cambió estado de ${estadoAnterior} a ${dto.estado}`);
    return this.obtenerPedidoPorId(pedido.pedidoId);
  }

  /**
   * Métricas y KPIs en vivo para el Call Center.
   */
  async obtenerEstadisticasCallCenter() {
    await this.autoSeedClientesSiEstaVacio();

    const pedidos = await this.pedidoRepo.find({
      relations: { entrega: true },
    });

    let totalPedidos = pedidos.length;
    let recibidos = 0;
    let enPreparacion = 0;
    let enRuta = 0;
    let entregados = 0;
    let cancelados = 0;
    let montoTotal = 0;

    for (const p of pedidos) {
      montoTotal += Number(p.total || 0);
      if (p.estado === 'RECIBIDO') recibidos++;
      else if (p.estado === 'EN_PREPARACION') enPreparacion++;
      else if (p.estado === 'EN_RUTA') enRuta++;
      else if (p.estado === 'ENTREGADO') entregados++;
      else if (p.estado === 'CANCELADO') cancelados++;
    }

    return {
      totalPedidos,
      recibidos,
      enPreparacion,
      enRuta,
      entregados,
      cancelados,
      montoTotal: Number(montoTotal.toFixed(2)),
    };
  }
}
