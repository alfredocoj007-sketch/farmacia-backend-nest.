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
import { MovimientoInventario } from '../../database/entities/movimiento-inventario.entity';
import { SesionCaja } from '../../database/entities/sesion-caja.entity';
import { MovimientoCaja } from '../../database/entities/movimiento-caja.entity';
import { Empleado } from '../../database/entities/empleado.entity';
import {
  CreatePedidoCallCenterDto,
  ItemPedidoCallCenterDto,
} from './dto/create-pedido-callcenter.dto';
import { CambiarEstadoPedidoDto } from './dto/cambiar-estado-pedido.dto';
import { QueryPedidosDto } from './dto/query-pedidos.dto';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

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
    @InjectRepository(MovimientoInventario)
    private readonly movimientoInventarioRepo: Repository<MovimientoInventario>,
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepo: Repository<SesionCaja>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoCajaRepo: Repository<MovimientoCaja>,
    @InjectRepository(Empleado)
    private readonly empleadoRepo: Repository<Empleado>,
    private readonly auditoriaService: AuditoriaService,
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
   * Catálogo inteligente de medicamentos para Call Center con stock multisede
   * y cálculo en tiempo real de lote prioritario bajo criterio FEFO (First Expire, First Out).
   */
  async obtenerMedicamentosDisponiblesCallCenter() {
    const productos = await this.productoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.categoria', 'cat')
      .leftJoinAndSelect('p.laboratorio', 'lab')
      .leftJoinAndSelect('p.unidadMedida', 'um')
      .where('p.estado = :est', { est: 'ACTIVO' })
      .orderBy('p.nombre', 'ASC')
      .getMany();

    // Consultar todos los inventarios disponibles no vencidos (criterio FEFO estricto)
    const inventarios = await this.inventarioRepo
      .createQueryBuilder('inv')
      .innerJoinAndSelect('inv.lote', 'lote')
      .innerJoinAndSelect('inv.sucursal', 'sucursal')
      .where('inv.cantidadDisponible > 0')
      .andWhere('lote.fechaVencimiento >= TRUNC(SYSDATE)')
      .orderBy('lote.fechaVencimiento', 'ASC')
      .getMany();

    const hoy = new Date();

    return productos.map((prod) => {
      const invsProd = inventarios.filter((i) => i.lote.productoId === prod.productoId);

      const stockTotal = invsProd.reduce(
        (sum, i) => sum + Number(i.cantidadDisponible),
        0,
      );

      const primerInvFefo = invsProd.length > 0 ? invsProd[0] : null;

      let fefolote = null;
      if (primerInvFefo) {
        const vtoDate = new Date(primerInvFefo.lote.fechaVencimiento);
        const diasParaVencer = Math.max(
          0,
          Math.ceil((vtoDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
        );

        fefolote = {
          loteId: primerInvFefo.lote.loteId,
          numeroLote: primerInvFefo.lote.numeroLote,
          fechaVencimiento: primerInvFefo.lote.fechaVencimiento,
          diasParaVencer,
          sucursalNombre: primerInvFefo.sucursal?.nombre || 'Farmacia',
          cantidadDisponibleEnLote: Number(primerInvFefo.cantidadDisponible),
        };
      }

      // Desglose por sucursales con stock
      const sucursalesMap = new Map<number, { sucursalId: number; nombre: string; stock: number }>();
      for (const inv of invsProd) {
        const actual = sucursalesMap.get(inv.sucursalId) || {
          sucursalId: inv.sucursalId,
          nombre: inv.sucursal?.nombre || `Sucursal #${inv.sucursalId}`,
          stock: 0,
        };
        actual.stock += Number(inv.cantidadDisponible);
        sucursalesMap.set(inv.sucursalId, actual);
      }

      return {
        productoId: prod.productoId,
        codigoProducto: prod.codigoProducto,
        nombre: prod.nombre,
        principioActivo: prod.principioActivo,
        presentacion: prod.presentacion,
        concentracion: prod.concentracion,
        unidadMedida: prod.unidadMedida?.nombre || null,
        unidadMedidaAbrev: prod.unidadMedida?.abreviatura || null,
        precioVenta: Number(prod.precioVenta),
        requiereReceta: prod.requiereReceta === 'S',
        categoria: prod.categoria
          ? { categoriaId: prod.categoria.categoriaId, nombre: prod.categoria.nombre }
          : null,
        laboratorio: prod.laboratorio
          ? { laboratorioId: prod.laboratorio.laboratorioId, nombre: prod.laboratorio.nombre }
          : null,
        stockTotal,
        agotado: stockTotal <= 0,
        fefoLote: fefolote,
        sucursalesConStock: Array.from(sucursalesMap.values()),
      };
    });
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

        // Sumar existencias disponibles bajo criterio FEFO (no vencidas)
        const inventarios = await this.inventarioRepo
          .createQueryBuilder('inv')
          .innerJoin('inv.lote', 'lote')
          .where('inv.sucursalId = :sucId', { sucId: suc.sucursalId })
          .andWhere('lote.productoId = :prodId', { prodId: item.productoId })
          .andWhere('inv.cantidadDisponible > 0')
          .andWhere('lote.fechaVencimiento >= TRUNC(SYSDATE)')
          .orderBy('lote.fechaVencimiento', 'ASC')
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

    // Comprobar estado de caja de cada sucursal
    for (const res of resultados) {
      const sesion = await this.sesionCajaRepo
        .createQueryBuilder('sesion')
        .innerJoin('sesion.caja', 'caja')
        .where('sesion.estado = :estado', { estado: 'ABIERTA' })
        .andWhere('caja.sucursalId = :sucId', { sucId: res.sucursalId })
        .getOne();
      (res as any).tieneCajaAbierta = !!sesion;
    }

    // Ordenar primero las sucursales con caja abierta y que pueden entregar completo
    return resultados.sort((a: any, b: any) => {
      const scoreB = (b.puedeEntregarCompleto ? 2 : 0) + (b.tieneCajaAbierta ? 1 : 0);
      const scoreA = (a.puedeEntregarCompleto ? 2 : 0) + (a.tieneCajaAbierta ? 1 : 0);
      return scoreB - scoreA;
    });
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
      const telLimpio = (dto.nuevoCliente.telefono || '').replace(/\D/g, '');
      if (telLimpio.length !== 8) {
        throw new BadRequestException('El número de teléfono debe tener exactamente 8 dígitos numéricos (sin letras ni símbolos).');
      }
      dto.nuevoCliente.telefono = telLimpio;

      const existente = await this.clienteRepo.findOne({
        where: { telefono: telLimpio },
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
          telefono: telLimpio,
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

    // 2.1 Validar que la sucursal preparadora tenga al menos un turno de caja abierto
    const sesionCajaActiva = await this.sesionCajaRepo
      .createQueryBuilder('sesion')
      .innerJoin('sesion.caja', 'caja')
      .where('sesion.estado = :estado', { estado: 'ABIERTA' })
      .andWhere('caja.sucursalId = :sucId', { sucId: sucursal.sucursalId })
      .getOne();

    if (!sesionCajaActiva) {
      throw new BadRequestException(
        `No se puede procesar el pedido: La sucursal "${sucursal.nombre}" no tiene ningún turno de caja abierto en este momento. Es obligatorio que la sucursal tenga una caja abierta para operar ventas y recepcionar pagos.`,
      );
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

      // Buscar lote disponible bajo FEFO en la sucursal asignada (estrictamente no vencido)
      const inventarios = await this.inventarioRepo
        .createQueryBuilder('inv')
        .innerJoinAndSelect('inv.lote', 'lote')
        .where('inv.sucursalId = :sucId', { sucId: sucursal.sucursalId })
        .andWhere('lote.productoId = :prodId', { prodId: producto.productoId })
        .andWhere('inv.cantidadDisponible >= :qty', { qty: item.cantidad })
        .andWhere('lote.fechaVencimiento >= TRUNC(SYSDATE)')
        .orderBy('lote.fechaVencimiento', 'ASC')
        .getMany();

      const invSeleccionado = inventarios.length > 0 ? inventarios[0] : null;

      if (!invSeleccionado) {
        throw new BadRequestException(
          `Stock insuficiente bajo protocolo FEFO para "${producto.nombre}" en la farmacia seleccionada (${sucursal.nombre}). Cantidad solicitada: ${item.cantidad}.`,
        );
      }

      const precioUnitario = Number(producto.precioVenta);
      const subtotal = Number((precioUnitario * item.cantidad).toFixed(2));
      totalPedido += subtotal;

      detallesAguardar.push({
        producto,
        lote: invSeleccionado.lote,
        cantidad: item.cantidad,
        precioUnitario,
        subtotal,
        inventarioAfectar: invSeleccionado,
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

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'PEDIDOS',
        operacion: 'INSERT',
        tablaAfectada: 'PEDIDO',
        registroId: pedidoGuardado.pedidoId,
        descripcion: `Creación de pedido telefónico / Call Center #PED-${pedidoGuardado.pedidoId} para cliente "${cliente.nombre} ${cliente.apellido || ''}". Preparación: ${sucursal.nombre}. Total: Q${totalPedido}.`.trim(),
        clientIdentifier: usuario?.username || 'callcenter',
        usuarioBd: usuario?.username || 'FARMACIA_APP',
      });
    } catch (e) {}

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
        requiereReceta: d.producto?.requiereReceta,
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
    const p = await this.pedidoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.cliente', 'cliente')
      .leftJoinAndSelect('p.sucursalPreparacion', 'sucursalPreparacion')
      .leftJoinAndSelect('p.metodoPago', 'metodoPago')
      .leftJoinAndSelect('p.entrega', 'entrega')
      .leftJoinAndSelect('p.pedidoDetalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .leftJoinAndSelect('detalles.lote', 'lote')
      .where('p.pedidoId = :pedidoId', { pedidoId })
      .getOne();

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
  async actualizarEstadoPedido(pedidoId: number, dto: CambiarEstadoPedidoDto, user?: AuthenticatedUser) {
    const pedido = await this.pedidoRepo.findOne({
      where: { pedidoId },
      relations: {
        entrega: true,
        sucursalPreparacion: true,
        metodoPago: true,
        pedidoDetalles: {
          producto: true,
          lote: true,
        },
      },
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
    } else if (dto.estado === 'ENTREGADO' && estadoAnterior !== 'ENTREGADO') {
      if (pedido.entrega) {
        pedido.entrega.estado = 'ENTREGADA';
        pedido.entrega.fechaEntrega = ahora;
        if (dto.personaRecibe) {
          pedido.entrega.personaRecibe = dto.personaRecibe.trim();
        }
      }

      // 1. Limpiar existencias reservadas y asentar salida oficial en el Kardex
      if (pedido.pedidoDetalles && pedido.sucursalPreparacion) {
        for (const det of pedido.pedidoDetalles) {
          if (det.lote) {
            const inv = await this.inventarioRepo.findOne({
              where: {
                sucursalId: pedido.sucursalPreparacion.sucursalId,
                loteId: det.lote.loteId,
              },
            });
            if (inv) {
              const qty = Number(det.cantidad || 0);
              // Descontar la cantidad que estaba reservada
              inv.cantidadReservada = Math.max(0, Number(inv.cantidadReservada || 0) - qty);
              inv.fechaActualizacion = ahora;
              await this.inventarioRepo.save(inv);

              // Registrar movimiento oficial de VENTA en el Kardex
              const movInv = this.movimientoInventarioRepo.create({
                inventario: inv,
                tipoMovimiento: 'VENTA',
                referenciaTipo: 'PEDIDO',
                referenciaId: pedido.pedidoId,
                cantidad: qty,
                cantidadAnterior: Number(inv.cantidadDisponible) + qty,
                cantidadNueva: Number(inv.cantidadDisponible),
                observacion: `Venta Call Center / Entrega a domicilio finalizada Ticket #PED-${pedido.pedidoId}`,
                fechaMovimiento: ahora,
              });
              await this.movimientoInventarioRepo.save(movInv);
            }
          }
        }
      }

      // 2. Liquidación en Caja: Ingresar el cobro en el turno de caja abierto del cajero/sucursal
      if (pedido.sucursalPreparacion) {
        const sesionActiva = await this.sesionCajaRepo
          .createQueryBuilder('sesion')
          .innerJoinAndSelect('sesion.caja', 'caja')
          .leftJoinAndSelect('sesion.empleadoApertura', 'empApertura')
          .where('sesion.estado = :estado', { estado: 'ABIERTA' })
          .andWhere('caja.sucursalId = :sucId', { sucId: pedido.sucursalPreparacion.sucursalId })
          .orderBy('sesion.fechaApertura', 'DESC')
          .getOne();

        if (sesionActiva) {
          let empleadoCobro = null;
          if (user?.empleadoId) {
            empleadoCobro = await this.empleadoRepo.findOne({
              where: { empleadoId: user.empleadoId },
            });
          }
          if (!empleadoCobro) {
            empleadoCobro = sesionActiva.empleadoApertura;
          }

          const movCaja = this.movimientoCajaRepo.create({
            sesionCaja: sesionActiva,
            empleado: empleadoCobro,
            metodoPago: pedido.metodoPago || undefined,
            tipoMovimiento: 'INGRESO',
            monto: Number(pedido.total),
            descripcion: `Liquidación Pedido Call Center #PED-${pedido.pedidoId} (${pedido.metodoPago?.nombre || 'Efectivo'})`,
            referenciaTipo: 'PEDIDO',
            referenciaId: pedido.pedidoId,
            fechaMovimiento: ahora,
          });
          await this.movimientoCajaRepo.save(movCaja);

          sesionActiva.totalIngresos = Number(sesionActiva.totalIngresos || 0) + Number(pedido.total);
          await this.sesionCajaRepo.save(sesionActiva);

          this.logger.log(
            `Liquidación de Pedido Call Center #${pedido.pedidoId} (Q${pedido.total}) ingresada a Caja ${sesionActiva.caja.codigoCaja} (Sesión #${sesionActiva.sesionCajaId})`,
          );
        } else {
          throw new BadRequestException(
            `No se puede liquidar el pedido: La sucursal "${pedido.sucursalPreparacion.nombre}" no tiene ningún turno de caja abierto para registrar el ingreso de Q${Number(pedido.total).toFixed(2)}. Debe abrirse una caja en la sucursal antes de liquidar el cobro.`,
          );
        }
      }
    } else if (dto.estado === 'CANCELADO' && estadoAnterior !== 'CANCELADO') {
      if (pedido.entrega) {
        pedido.entrega.estado = 'CANCELADA';
      }
      // Revertir existencias reservadas a disponibles en la sucursal preparadora
      if (pedido.pedidoDetalles && pedido.sucursalPreparacion) {
        for (const det of pedido.pedidoDetalles) {
          if (det.lote) {
            const inv = await this.inventarioRepo.findOne({
              where: {
                sucursalId: pedido.sucursalPreparacion.sucursalId,
                loteId: det.lote.loteId,
              },
            });
            if (inv) {
              const qty = Number(det.cantidad || 0);
              inv.cantidadReservada = Math.max(0, Number(inv.cantidadReservada || 0) - qty);
              inv.cantidadDisponible = Number(inv.cantidadDisponible || 0) + qty;
              inv.fechaActualizacion = new Date();
              await this.inventarioRepo.save(inv);
            }
          }
        }
      }
    }

    if (pedido.entrega) {
      await this.entregaRepo.save(pedido.entrega);
    }
    await this.pedidoRepo.save(pedido);

    this.logger.log(`Pedido #${pedido.pedidoId} cambió estado de ${estadoAnterior} a ${dto.estado}`);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'PEDIDOS',
        operacion: dto.estado === 'CANCELADO' ? 'DELETE' : 'UPDATE',
        tablaAfectada: 'PEDIDO',
        registroId: pedido.pedidoId,
        descripcion: `Pedido Call Center #PED-${pedido.pedidoId} cambió estado: ${estadoAnterior} -> ${dto.estado}.`,
        clientIdentifier: user?.username || 'operador',
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return this.obtenerPedidoPorId(pedido.pedidoId);
  }

  /**
   * Métricas y KPIs en vivo para el Call Center.
   */
  async obtenerEstadisticasCallCenter(sucursalId?: number) {
    await this.autoSeedClientesSiEstaVacio();

    const findOptions: any = {
      relations: { entrega: true, sucursalPreparacion: true, cliente: true },
      order: { pedidoId: 'DESC' },
    };
    if (sucursalId) {
      findOptions.where = { sucursalPreparacion: { sucursalId } };
    }

    const pedidos = await this.pedidoRepo.find(findOptions);

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

    const ultimoPorDespachar = pedidos.find(
      (p) => p.estado === 'RECIBIDO' || p.estado === 'EN_PREPARACION',
    );

    return {
      totalPedidos,
      recibidos,
      enPreparacion,
      enRuta,
      entregados,
      cancelados,
      montoTotal: Number(montoTotal.toFixed(2)),
      porDespachar: recibidos + enPreparacion,
      ultimoPedido: ultimoPorDespachar
        ? {
            pedidoId: ultimoPorDespachar.pedidoId,
            estado: ultimoPorDespachar.estado,
            total: Number(ultimoPorDespachar.total),
            sucursalNombre: ultimoPorDespachar.sucursalPreparacion?.nombre || 'Sucursal',
            clienteNombre: ultimoPorDespachar.cliente?.nombre || 'Cliente',
          }
        : null,
    };
  }
}
