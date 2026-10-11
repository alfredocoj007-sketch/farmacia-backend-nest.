import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from '../../database/entities/pedido.entity';
import { PedidoDetalle } from '../../database/entities/pedido-detalle.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { Lote } from '../../database/entities/lote.entity';
import { MovimientoInventario } from '../../database/entities/movimiento-inventario.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Cliente } from '../../database/entities/cliente.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { Producto } from '../../database/entities/producto.entity';
import { SesionCaja } from '../../database/entities/sesion-caja.entity';
import { MovimientoCaja } from '../../database/entities/movimiento-caja.entity';
import { Empleado } from '../../database/entities/empleado.entity';
import { Caja } from '../../database/entities/caja.entity';
import { Municipio } from '../../database/entities/municipio.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateVentaPosDto } from './dto/create-venta-pos.dto';
import { QueryVentasDto } from './dto/query-ventas.dto';

@Injectable()
export class VentasService {
  private readonly logger = new Logger(VentasService.name);

  constructor(
    @InjectRepository(Pedido)
    private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(PedidoDetalle)
    private readonly pedidoDetalleRepo: Repository<PedidoDetalle>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
    @InjectRepository(MovimientoInventario)
    private readonly movimientoInventarioRepo: Repository<MovimientoInventario>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(MetodoPago)
    private readonly metodoPagoRepo: Repository<MetodoPago>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepo: Repository<SesionCaja>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoCajaRepo: Repository<MovimientoCaja>,
    @InjectRepository(Empleado)
    private readonly empleadoRepo: Repository<Empleado>,
    @InjectRepository(Caja)
    private readonly cajaRepo: Repository<Caja>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Obtiene o crea el cliente default "Consumidor Final (C/F)" o registra cliente con NIT
   */
  private async resolverCliente(
    clienteDto?: CreateVentaPosDto['cliente'],
    sucursal?: Sucursal | null,
  ): Promise<Cliente> {
    const rawNit = (clienteDto?.nit || 'CF').trim().toUpperCase();
    const esCF = !rawNit || rawNit === 'CF' || rawNit === 'C/F' || rawNit === 'CONSUMIDOR FINAL';
    const nit = esCF ? 'CF' : rawNit;

    // Obtener un municipio válido para satisfacer la restricción NOT NULL en BD Oracle
    let municipio = sucursal?.municipio;
    if (!municipio) {
      municipio =
        (await this.sucursalRepo.manager.findOne(Municipio, {
          where: {},
        })) || undefined;
    }

    if (esCF) {
      let clienteCF = await this.clienteRepo.findOne({
        where: { telefono: '2000-0000' },
      });
      if (!clienteCF) {
        clienteCF = this.clienteRepo.create({
          nombre: 'Consumidor',
          apellido: 'Final (C/F)',
          telefono: '2000-0000',
          direccion: 'Ciudad de Guatemala',
          estado: 'ACTIVO',
          referenciaDireccion: 'Venta rápida de mostrador POS',
          municipio,
        });
        clienteCF = await this.clienteRepo.save(clienteCF);
      }
      return clienteCF;
    }

    // Cliente con NIT específico
    const telefonoNit = `NIT-${nit}`.slice(0, 30);
    const nombreLimpio =
      clienteDto?.nombre &&
      clienteDto.nombre.trim() &&
      !clienteDto.nombre.toLowerCase().includes('consumidor final')
        ? clienteDto.nombre.trim().slice(0, 100)
        : `Contribuyente NIT ${nit}`;
    const direccionLimpia =
      clienteDto?.direccion && clienteDto.direccion.trim()
        ? clienteDto.direccion.trim().slice(0, 400)
        : 'Ciudad de Guatemala';

    // Buscar si ya existe este cliente por NIT (por apellido 'NIT: <nit>', telefono 'NIT-<nit>' o referencia)
    let cliente = await this.clienteRepo
      .createQueryBuilder('c')
      .where('c.apellido = :nitAp', { nitAp: `NIT: ${nit}` })
      .orWhere('c.telefono = :telNit', { telNit: telefonoNit })
      .orWhere('c.referenciaDireccion = :refNit', { refNit: `Facturación FEL NIT ${nit}` })
      .getOne();

    if (cliente) {
      // Actualizar datos del cliente con el nombre y NIT actuales
      cliente.nombre = nombreLimpio;
      cliente.apellido = `NIT: ${nit}`;
      cliente.direccion = direccionLimpia;
      cliente.referenciaDireccion = `Facturación FEL NIT ${nit}`;
      cliente = await this.clienteRepo.save(cliente);
    } else {
      // Crear nuevo cliente con NIT
      cliente = this.clienteRepo.create({
        nombre: nombreLimpio,
        apellido: `NIT: ${nit}`,
        telefono: telefonoNit,
        direccion: direccionLimpia,
        estado: 'ACTIVO',
        referenciaDireccion: `Facturación FEL NIT ${nit}`,
        municipio,
      });
      cliente = await this.clienteRepo.save(cliente);
    }

    return cliente;
  }

  /**
   * Registra una venta en el Punto de Venta (POS):
   * 1. Descuenta stock bajo criterio FEFO.
   * 2. Registra el PEDIDO (Origen: MOSTRADOR) y sus PEDIDO_DETALLE.
   * 3. Registra MOVIMIENTO_INVENTARIO ('VENTA').
   * 4. Si hay sesión de caja abierta, registra MOVIMIENTO_CAJA ('INGRESO') vinculando el cobro.
   * 5. Emite la estructura de Factura Electrónica FEL (SAT Guatemala).
   */
  async registrarVenta(dto: CreateVentaPosDto, usuario: any) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El ticket de venta debe incluir al menos un producto.');
    }

    const sucursal = await this.sucursalRepo.findOne({
      where: { sucursalId: dto.sucursalId, estado: 'ACTIVA' },
      relations: { municipio: true },
    });
    if (!sucursal) {
      throw new NotFoundException(`Sucursal #${dto.sucursalId} no encontrada o inactiva.`);
    }

    const metodoPago = await this.metodoPagoRepo.findOne({
      where: { metodoPagoId: dto.metodoPagoId, estado: 'ACTIVO' },
    });
    if (!metodoPago) {
      throw new NotFoundException(`Método de pago #${dto.metodoPagoId} no válido.`);
    }

    const cliente = await this.resolverCliente(dto.cliente, sucursal);

    // Preparar líneas de venta y validar existencias FEFO
    let totalVenta = 0;
    const lineasProcesadas: {
      producto: Producto;
      lote: Lote;
      inventario: Inventario;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      stockAnterior: number;
      stockNuevo: number;
    }[] = [];

    for (const item of dto.items) {
      if (item.cantidad <= 0) {
        throw new BadRequestException(`La cantidad debe ser mayor a 0.`);
      }

      const producto = await this.productoRepo.findOne({
        where: { productoId: item.productoId, estado: 'ACTIVO' },
      });
      if (!producto) {
        throw new NotFoundException(`Producto #${item.productoId} no encontrado o inactivo.`);
      }

      // Buscar inventario disponible bajo FEFO
      let invQuery = this.inventarioRepo
        .createQueryBuilder('inv')
        .innerJoinAndSelect('inv.lote', 'lote')
        .where('inv.sucursalId = :sucId', { sucId: sucursal.sucursalId })
        .andWhere('lote.productoId = :prodId', { prodId: producto.productoId })
        .andWhere('inv.cantidadDisponible >= :qty', { qty: item.cantidad });

      if (item.loteId) {
        invQuery = invQuery.andWhere('lote.loteId = :loteId', { loteId: item.loteId });
      }

      // Ordenar por fecha de vencimiento más próxima (FEFO)
      invQuery = invQuery.orderBy('lote.fechaVencimiento', 'ASC');

      const inventario = await invQuery.getOne();

      if (!inventario) {
        throw new BadRequestException(
          `Stock insuficiente para "${producto.nombre}" en ${sucursal.nombre}. Cantidad solicitada: ${item.cantidad}.`,
        );
      }

      const precioUnitario = Number(producto.precioVenta);
      const subtotal = Number((precioUnitario * item.cantidad).toFixed(2));
      totalVenta += subtotal;

      const stockAnterior = Number(inventario.cantidadDisponible);
      const stockNuevo = stockAnterior - item.cantidad;

      lineasProcesadas.push({
        producto,
        lote: inventario.lote,
        inventario,
        cantidad: item.cantidad,
        precioUnitario,
        subtotal,
        stockAnterior,
        stockNuevo,
      });
    }

    totalVenta = Number(totalVenta.toFixed(2));
    const montoRecibido = dto.montoRecibido ? Number(dto.montoRecibido) : totalVenta;
    const cambio = Number(Math.max(0, montoRecibido - totalVenta).toFixed(2));

    const rawNit = (dto.cliente?.nit || 'CF').trim().toUpperCase();
    const esCF = !rawNit || rawNit === 'CF' || rawNit === 'C/F' || rawNit === 'CONSUMIDOR FINAL';
    const nit = esCF ? 'CF' : rawNit;

    // 1. Guardar el PEDIDO (Origen: SUCURSAL)
    const nuevoPedido = this.pedidoRepo.create({
      cliente,
      sucursalPreparacion: sucursal,
      metodoPago,
      total: totalVenta,
      origen: 'SUCURSAL',
      fechaPedido: new Date(),
      fechaConfirmacion: new Date(),
      estado: 'ENTREGADO',
      observacion:
        dto.observacion?.trim() ||
        (!esCF
          ? `Venta mostrador POS - NIT: ${nit}`
          : `Venta rápida mostrador POS en ${sucursal.nombre}`),
    });
    const pedidoGuardado = await this.pedidoRepo.save(nuevoPedido);

    // 2. Guardar Detalles de Pedido y Actualizar Inventario (FEFO)
    for (const linea of lineasProcesadas) {
      const det = this.pedidoDetalleRepo.create({
        pedido: pedidoGuardado,
        producto: linea.producto,
        lote: linea.lote,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario,
        subtotal: linea.subtotal,
      });
      await this.pedidoDetalleRepo.save(det);

      // Descontar inventario disponible
      linea.inventario.cantidadDisponible = linea.stockNuevo;
      linea.inventario.fechaActualizacion = new Date();
      await this.inventarioRepo.save(linea.inventario);

      // Registrar movimiento en el kardex de inventario
      const movInv = this.movimientoInventarioRepo.create({
        inventario: linea.inventario,
        tipoMovimiento: 'VENTA',
        referenciaTipo: 'PEDIDO',
        referenciaId: pedidoGuardado.pedidoId,
        cantidad: linea.cantidad,
        cantidadAnterior: linea.stockAnterior,
        cantidadNueva: linea.stockNuevo,
        observacion: `Venta POS mostrador Ticket #${pedidoGuardado.pedidoId}`,
        fechaMovimiento: new Date(),
      });
      await this.movimientoInventarioRepo.save(movInv);
    }

    // 3. Conexión con Caja: Si hay sesión abierta en la sucursal, registrar INGRESO de efectivo/tarjeta
    let sesionActiva = null;
    let cajaCodigo = null;

    let sesionQuery = this.sesionCajaRepo
      .createQueryBuilder('sesion')
      .innerJoinAndSelect('sesion.caja', 'caja')
      .leftJoinAndSelect('sesion.empleadoApertura', 'empApertura')
      .where('sesion.estado = :estado', { estado: 'ABIERTA' })
      .andWhere('caja.sucursalId = :sucId', { sucId: sucursal.sucursalId });

    if (dto.cajaId) {
      sesionQuery = sesionQuery.andWhere('caja.cajaId = :cajaId', { cajaId: dto.cajaId });
    }

    sesionActiva = await sesionQuery.orderBy('sesion.fechaApertura', 'DESC').getOne();

    if (!sesionActiva) {
      throw new BadRequestException(
        `No es posible procesar el cobro: No existe un turno de caja abierto en la sucursal "${sucursal.nombre}". El cajero debe realizar la apertura formal de turno antes de cobrar.`,
      );
    }

    cajaCodigo = sesionActiva.caja.codigoCaja;

      let empleadoCobro = null;
      if (usuario?.empleadoId) {
        empleadoCobro = await this.empleadoRepo.findOne({ where: { empleadoId: usuario.empleadoId } });
      }
      if (!empleadoCobro) {
        empleadoCobro = sesionActiva.empleadoApertura;
      }

      // Crear movimiento de ingreso en caja
      const movCaja = this.movimientoCajaRepo.create({
        sesionCaja: sesionActiva,
        empleado: empleadoCobro,
        metodoPago,
        tipoMovimiento: 'INGRESO',
        monto: totalVenta,
        descripcion: `Venta POS #${pedidoGuardado.pedidoId} - Factura FEL (${metodoPago.nombre})`,
        referenciaTipo: 'VENTA',
        referenciaId: pedidoGuardado.pedidoId,
        fechaMovimiento: new Date(),
      });
      await this.movimientoCajaRepo.save(movCaja);

      // Incrementar ingresos acumulados de la sesión de caja
      sesionActiva.totalIngresos = Number(sesionActiva.totalIngresos) + totalVenta;
      await this.sesionCajaRepo.save(sesionActiva);

      this.logger.log(
        `Ingreso registrado en Caja ${cajaCodigo} (Sesión #${sesionActiva.sesionCajaId}) por Q${totalVenta}`,
      );

    // 4. Estructura Oficial Factura Electrónica FEL (SAT Guatemala)
    const serieFEL = `FARM${String(sucursal.sucursalId).padStart(2, '0')}`;
    const correlativoFEL = String(pedidoGuardado.pedidoId).padStart(8, '0');
    const numeroFactura = `${serieFEL}-${correlativoFEL}`;
    const autorizacionDTE = `DTE-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const baseImponible = Number((totalVenta / 1.12).toFixed(2));
    const ivaMonto = Number((totalVenta - baseImponible).toFixed(2));

    const felData = {
      numeroFactura,
      serie: serieFEL,
      autorizacionDte: autorizacionDTE,
      fechaCertificacion: new Date(),
      emisor: {
        nombre: 'FarmaGest S.A. - Red Farmacéutica Nacional',
        nombreComercial: `FarmaGest (${sucursal.nombre})`,
        nit: '9845120-K',
        direccion: sucursal.direccion,
        telefono: sucursal.telefono,
      },
      receptor: {
        nit: esCF ? 'CF' : nit,
        nombre: esCF
          ? 'Consumidor Final (C/F)'
          : (cliente.nombre && !cliente.nombre.toLowerCase().includes('consumidor final')
              ? cliente.nombre
              : dto.cliente?.nombre?.trim() || `Contribuyente NIT ${nit}`),
        direccion: cliente.direccion,
      },
      totales: {
        baseImponible,
        iva: ivaMonto,
        total: totalVenta,
        montoRecibido,
        cambio,
      },
      caja: cajaCodigo ? { codigo: cajaCodigo, sesionId: sesionActiva?.sesionCajaId } : null,
    };

    // 5. Registrar evento en bitácora de auditoría
    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'VENTAS_POS',
        operacion: 'INSERT',
        tablaAfectada: 'PEDIDO',
        registroId: pedidoGuardado.pedidoId,
        descripcion: `Venta mostrador Factura #${numeroFactura} por Q${totalVenta} registrada en ${sucursal.nombre} (${metodoPago.nombre}).`,
        clientIdentifier: usuario?.username || 'cajero',
        usuarioBd: usuario?.username || 'FARMACIA_APP',
      });
    } catch (e) {
      this.logger.warn('No se pudo registrar auditoría de venta:', e);
    }

    return {
      pedidoId: pedidoGuardado.pedidoId,
      fechaVenta: pedidoGuardado.fechaPedido,
      estado: pedidoGuardado.estado,
      total: totalVenta,
      metodoPago: metodoPago.nombre,
      sucursal: {
        sucursalId: sucursal.sucursalId,
        nombre: sucursal.nombre,
      },
      cliente: {
        nombre: felData.receptor.nombre,
        nit: felData.receptor.nit,
        direccion: cliente.direccion,
      },
      fel: felData,
      items: lineasProcesadas.map((l) => ({
        productoId: l.producto.productoId,
        nombre: l.producto.nombre,
        principioActivo: l.producto.principioActivo,
        lote: l.lote.numeroLote,
        fechaVencimiento: l.lote.fechaVencimiento,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal: l.subtotal,
      })),
    };
  }

  /**
   * Listado de ventas realizadas en mostrador con filtros
   */
  async listarVentas(query: QueryVentasDto) {
    const qb = this.pedidoRepo
      .createQueryBuilder('pedido')
      .leftJoinAndSelect('pedido.cliente', 'cliente')
      .leftJoinAndSelect('pedido.sucursalPreparacion', 'sucursal')
      .leftJoinAndSelect('pedido.metodoPago', 'metodoPago')
      .leftJoinAndSelect('pedido.pedidoDetalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .leftJoinAndSelect('detalles.lote', 'lote')
      .where("pedido.origen IN ('SUCURSAL', 'MOSTRADOR')")
      .orderBy('pedido.pedidoId', 'DESC');

    if (query.sucursalId) {
      qb.andWhere('sucursal.sucursalId = :sucId', { sucId: Number(query.sucursalId) });
    }

    if (query.busqueda && query.busqueda.trim()) {
      const term = `%${query.busqueda.trim().toUpperCase()}%`;
      qb.andWhere(
        '(UPPER(cliente.nombre) LIKE :term OR UPPER(cliente.apellido) LIKE :term OR CAST(pedido.pedidoId AS VARCHAR2(20)) LIKE :term)',
        { term },
      );
    }

    const limit = query.limit ? Number(query.limit) : 50;
    qb.take(limit);

    const items = await qb.getMany();

    return items.map((p) => {
      const total = Number(p.total);
      const base = Number((total / 1.12).toFixed(2));
      const iva = Number((total - base).toFixed(2));
      const serie = `FARM${String(p.sucursalPreparacion?.sucursalId || 1).padStart(2, '0')}`;
      const numeroFactura = `${serie}-${String(p.pedidoId).padStart(8, '0')}`;

      return {
        pedidoId: p.pedidoId,
        numeroFactura,
        fecha: p.fechaPedido,
        total,
        baseImponible: base,
        iva,
        estado: p.estado,
        metodoPago: p.metodoPago?.nombre || 'EFECTIVO',
        sucursal: p.sucursalPreparacion?.nombre,
        cliente: (() => {
          if (!p.cliente) return 'Consumidor Final (C/F)';
          const nom = p.cliente.nombre?.trim() || '';
          const ape = p.cliente.apellido?.trim() || '';
          if (nom.toLowerCase().includes('consumidor') && (ape.toLowerCase().includes('final') || !ape)) {
            return 'Consumidor Final (C/F)';
          }
          if (ape.startsWith('NIT:')) {
            const nitVal = ape.replace('NIT:', '').trim();
            return `${nom} (NIT: ${nitVal})`;
          }
          return `${nom} ${ape}`.trim() || 'Consumidor Final (C/F)';
        })(),
        nit: (() => {
          if (p.cliente?.apellido?.startsWith('NIT: ')) {
            return p.cliente.apellido.replace('NIT: ', '').trim();
          }
          if (p.cliente?.telefono?.startsWith('NIT-')) {
            return p.cliente.telefono.replace('NIT-', '').trim();
          }
          if (p.observacion?.includes('NIT: ')) {
            const match = p.observacion.match(/NIT:\s*([A-Za-z0-9-]+)/);
            if (match) return match[1];
          }
          return 'CF';
        })(),
        totalItems: p.pedidoDetalles?.length || 0,
        detalles: (p.pedidoDetalles || []).map((d) => ({
          producto: d.producto?.nombre,
          lote: d.lote?.numeroLote,
          cantidad: Number(d.cantidad),
          precioUnitario: Number(d.precioUnitario),
          subtotal: Number(d.subtotal),
        })),
      };
    });
  }

  /**
   * Detalle completo de una venta para comprobante o reimpresión de ticket
   */
  async obtenerVentaPorId(pedidoId: number) {
    const p = await this.pedidoRepo.findOne({
      where: { pedidoId },
      relations: {
        cliente: true,
        sucursalPreparacion: true,
        metodoPago: true,
        pedidoDetalles: {
          producto: true,
          lote: true,
        },
      },
    });

    if (!p) {
      throw new NotFoundException(`Venta #${pedidoId} no encontrada.`);
    }

    const total = Number(p.total);
    const baseImponible = Number((total / 1.12).toFixed(2));
    const iva = Number((total - baseImponible).toFixed(2));
    const sucursalId = p.sucursalPreparacion?.sucursalId || 1;
    const sucursalNombre = p.sucursalPreparacion?.nombre || 'Sucursal Principal';
    const serie = `FARM${String(sucursalId).padStart(2, '0')}`;
    const numeroFactura = `${serie}-${String(p.pedidoId).padStart(8, '0')}`;
    const autorizacionDte = `DTE-${p.pedidoId}-CERT-${String(p.fechaPedido.getTime()).slice(-8)}`;

    let clienteNit = 'CF';
    if (p.cliente?.apellido?.startsWith('NIT: ')) {
      clienteNit = p.cliente.apellido.replace('NIT: ', '').trim();
    } else if (p.cliente?.telefono?.startsWith('NIT-')) {
      clienteNit = p.cliente.telefono.replace('NIT-', '').trim();
    } else if (p.cliente?.referenciaDireccion?.includes('NIT ')) {
      const match = p.cliente.referenciaDireccion.match(/NIT\s+([A-Za-z0-9-]+)/);
      if (match) clienteNit = match[1];
    } else if (p.observacion?.includes('NIT: ')) {
      const match = p.observacion.match(/NIT:\s*([A-Za-z0-9-]+)/);
      if (match) clienteNit = match[1];
    }

    let clienteNombre = 'Consumidor Final (C/F)';
    if (p.cliente) {
      const nom = p.cliente.nombre?.trim() || '';
      const ape = p.cliente.apellido?.trim() || '';
      if (
        nom.toLowerCase().includes('consumidor') &&
        (ape.toLowerCase().includes('final') || !ape)
      ) {
        clienteNombre = 'Consumidor Final (C/F)';
      } else {
        clienteNombre = ape.startsWith('NIT:') ? nom : `${nom} ${ape}`.trim();
      }
    }

    const felData = {
      autorizacionDte,
      serie,
      numeroFactura,
      fechaCertificacion: p.fechaPedido,
      emisor: {
        nit: '9845120-K',
        nombreComercial: `Farmacia ProSalud - ${sucursalNombre}`,
        direccion: p.sucursalPreparacion?.direccion || 'Ciudad de Guatemala',
      },
      receptor: {
        nit: clienteNit,
        nombre: clienteNombre,
      },
      totales: {
        baseImponible,
        iva,
        total,
      },
    };

    return {
      pedidoId: p.pedidoId,
      fechaVenta: p.fechaPedido,
      fechaEmision: p.fechaPedido,
      estado: p.estado,
      total,
      metodoPago: p.metodoPago?.nombre || 'EFECTIVO',
      sucursal: {
        sucursalId: p.sucursalPreparacion?.sucursalId,
        nombre: sucursalNombre,
        direccion: p.sucursalPreparacion?.direccion,
        telefono: p.sucursalPreparacion?.telefono,
      },
      cliente: {
        nombre: clienteNombre,
        nit: clienteNit,
        direccion: p.cliente?.direccion || 'Ciudad de Guatemala',
        telefono: p.cliente?.telefono || '',
      },
      fel: felData,
      numeroFactura,
      serie,
      autorizacionDte,
      totales: {
        baseImponible,
        iva,
        total,
      },
      items: (p.pedidoDetalles || []).map((d) => ({
        productoId: d.producto?.productoId,
        nombre: d.producto?.nombre,
        codigo: d.producto?.codigoProducto,
        lote: d.lote?.numeroLote,
        fechaVencimiento: d.lote?.fechaVencimiento,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
      })),
    };
  }

  /**
   * Búsqueda ágil de medicamentos con existencias locales y criterio FEFO para el mostrador
   */
  async buscarProductosPos(termino: string, sucursalId: number) {
    const qb = this.productoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.categoria', 'cat')
      .leftJoinAndSelect('p.unidadMedida', 'um')
      .where('p.estado = :est', { est: 'ACTIVO' });

    if (termino && termino.trim()) {
      const term = `%${termino.trim().toUpperCase()}%`;
      qb.andWhere(
        '(UPPER(p.nombre) LIKE :term OR UPPER(p.codigoProducto) LIKE :term OR UPPER(p.principioActivo) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('p.nombre', 'ASC').take(30);

    const productos = await qb.getMany();

    // Obtener inventario disponible por lote en la sucursal seleccionada
    const resultado = await Promise.all(
      productos.map(async (prod) => {
        const inventarios = await this.inventarioRepo
          .createQueryBuilder('inv')
          .innerJoinAndSelect('inv.lote', 'lote')
          .where('inv.sucursalId = :sucId', { sucId: sucursalId })
          .andWhere('lote.productoId = :prodId', { prodId: prod.productoId })
          .andWhere('inv.cantidadDisponible > 0')
          .orderBy('lote.fechaVencimiento', 'ASC')
          .getMany();

        const stockTotal = inventarios.reduce(
          (sum, inv) => sum + Number(inv.cantidadDisponible),
          0,
        );

        const proximoLote = inventarios.length > 0 ? inventarios[0].lote : null;

        return {
          productoId: prod.productoId,
          codigoProducto: prod.codigoProducto,
          nombre: prod.nombre,
          principioActivo: prod.principioActivo,
          presentacion: prod.presentacion,
          unidadMedida: prod.unidadMedida?.nombre || null,
          unidadMedidaAbrev: prod.unidadMedida?.abreviatura || null,
          categoria: prod.categoria?.nombre || 'General',
          requiereReceta: prod.requiereReceta === 'S',
          precioVenta: Number(prod.precioVenta),
          stockDisponible: stockTotal,
          proximoLote: proximoLote
            ? {
                loteId: proximoLote.loteId,
                numeroLote: proximoLote.numeroLote,
                fechaVencimiento: proximoLote.fechaVencimiento,
              }
            : null,
        };
      }),
    );

    return resultado;
  }

  /**
   * Comprueba si la sucursal tiene un turno de caja abierto actualmente
   */
  async verificarSesionCajaSucursal(sucursalId: number) {
    const sesion = await this.sesionCajaRepo
      .createQueryBuilder('sesion')
      .innerJoinAndSelect('sesion.caja', 'caja')
      .leftJoinAndSelect('sesion.empleadoApertura', 'emp')
      .where('caja.sucursalId = :sucId', { sucId: sucursalId })
      .andWhere('sesion.estado = :estado', { estado: 'ABIERTA' })
      .orderBy('sesion.fechaApertura', 'DESC')
      .getOne();

    if (!sesion) {
      return {
        abierta: false,
        mensaje: 'No hay ninguna caja abierta en esta sede. Puedes realizar ventas, pero no ingresarán a turno de arqueo.',
      };
    }

    return {
      abierta: true,
      cajaId: sesion.caja.cajaId,
      codigoCaja: sesion.caja.codigoCaja,
      sesionCajaId: sesion.sesionCajaId,
      cajero: `${sesion.empleadoApertura?.nombre || ''} ${sesion.empleadoApertura?.apellido || ''}`.trim(),
      saldoInicial: Number(sesion.saldoInicial),
      totalIngresos: Number(sesion.totalIngresos),
      fechaApertura: sesion.fechaApertura,
    };
  }

  /**
   * Obtiene la disponibilidad de existencias de un medicamento en cada sucursal de la red
   */
  async obtenerStockRedProducto(productoId: number) {
    const producto = await this.productoRepo.findOne({
      where: { productoId },
      relations: { categoria: true, laboratorio: true, unidadMedida: true },
    });

    if (!producto) {
      throw new NotFoundException(`El producto #${productoId} no existe.`);
    }

    const sucursales = await this.sucursalRepo.find({
      where: [{ estado: 'ACTIVA' }, { estado: 'ACTIVO' }],
      order: { tipoSucursal: 'ASC', nombre: 'ASC' },
    });

    // Obtener inventarios con stock > 0 para este producto
    const inventarios = await this.inventarioRepo
      .createQueryBuilder('inv')
      .innerJoinAndSelect('inv.lote', 'lote')
      .where('lote.productoId = :productoId', { productoId })
      .andWhere('inv.cantidadDisponible > 0')
      .orderBy('lote.fechaVencimiento', 'ASC')
      .getMany();

    const sedes = sucursales.map((suc) => {
      const invsSede = inventarios.filter(
        (inv) => Number(inv.sucursalId) === Number(suc.sucursalId),
      );

      const stockDisponible = invsSede.reduce(
        (sum, inv) => sum + Number(inv.cantidadDisponible),
        0,
      );

      const proximoVencimiento =
        invsSede.length > 0 ? invsSede[0].lote?.fechaVencimiento : null;

      return {
        sucursalId: suc.sucursalId,
        nombre: suc.nombre,
        tipoSucursal: suc.tipoSucursal,
        direccion: suc.direccion || null,
        telefono: suc.telefono || null,
        stockDisponible,
        totalLotes: invsSede.length,
        proximoVencimiento,
      };
    });

    return {
      producto: {
        productoId: producto.productoId,
        codigoProducto: producto.codigoProducto,
        nombre: producto.nombre,
        principioActivo: producto.principioActivo,
        presentacion: producto.presentacion,
        concentracion: producto.concentracion,
        unidadMedida: producto.unidadMedida?.nombre || null,
        unidadMedidaAbrev: producto.unidadMedida?.abreviatura || null,
        precioVenta: Number(producto.precioVenta),
      },
      sedes,
      stockTotalRed: sedes.reduce((acc, s) => acc + s.stockDisponible, 0),
    };
  }
}
