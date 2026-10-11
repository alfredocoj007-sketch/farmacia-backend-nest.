import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from '../../database/entities/pedido.entity';
import { PedidoDetalle } from '../../database/entities/pedido-detalle.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { Lote } from '../../database/entities/lote.entity';
import { Producto } from '../../database/entities/producto.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { SesionCaja } from '../../database/entities/sesion-caja.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { QueryReportesDto } from './dto/query-reportes.dto';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(PedidoDetalle)
    private readonly pedidoDetalleRepo: Repository<PedidoDetalle>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepo: Repository<SesionCaja>,
    @InjectRepository(MetodoPago)
    private readonly metodoPagoRepo: Repository<MetodoPago>,
  ) {}

  /**
   * Resuelve el rango de fechas [inicio, fin] según el periodo solicitado
   */
  private resolverRangoFechas(dto: QueryReportesDto): { fechaInicio?: Date; fechaFin?: Date } {
    const periodo = (dto.periodo ?? 'MES').toUpperCase();
    const ahora = new Date();

    if (periodo === 'HOY') {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
      const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
      return { fechaInicio: inicio, fechaFin: fin };
    }

    if (periodo === 'SEMANA') {
      const inicio = new Date(ahora);
      inicio.setDate(inicio.getDate() - 7);
      inicio.setHours(0, 0, 0, 0);
      return { fechaInicio: inicio, fechaFin: ahora };
    }

    if (periodo === 'MES') {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
      return { fechaInicio: inicio, fechaFin: ahora };
    }

    if (periodo === 'ANIO') {
      const inicio = new Date(ahora.getFullYear(), 0, 1, 0, 0, 0);
      return { fechaInicio: inicio, fechaFin: ahora };
    }

    if (periodo === 'PERSONALIZADO' && dto.fechaInicio) {
      const inicio = new Date(dto.fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = dto.fechaFin ? new Date(dto.fechaFin) : new Date(inicio);
      fin.setHours(23, 59, 59, 999);
      return { fechaInicio: inicio, fechaFin: fin };
    }

    // HISTORICO / DEFAULT
    return {};
  }

  /**
   * 1. REPORTE CONSOLIDADO DE VENTAS E INGRESOS
   */
  async obtenerReporteVentas(dto: QueryReportesDto) {
    const { fechaInicio, fechaFin } = this.resolverRangoFechas(dto);

    const qb = this.pedidoRepo
      .createQueryBuilder('pedido')
      .leftJoinAndSelect('pedido.metodoPago', 'metodo')
      .leftJoinAndSelect('pedido.sucursalPreparacion', 'sucursal')
      .leftJoinAndSelect('pedido.cliente', 'cliente')
      .where("pedido.estado != 'CANCELADO'");

    if (dto.sucursalId) {
      qb.andWhere('pedido.sucursalPreparacionId = :sucId', { sucId: dto.sucursalId });
    }

    if (fechaInicio) {
      qb.andWhere('pedido.fechaPedido >= :inicio', { inicio: fechaInicio });
    }
    if (fechaFin) {
      qb.andWhere('pedido.fechaPedido <= :fin', { fin: fechaFin });
    }

    qb.orderBy('pedido.fechaPedido', 'DESC');

    const pedidos = await qb.getMany();

    const totalVentas = pedidos.length;
    const montoTotal = pedidos.reduce((acc, p) => acc + Number(p.total), 0);
    const baseImponible = Number((montoTotal / 1.12).toFixed(2));
    const ivaTotal = Number((montoTotal - baseImponible).toFixed(2));
    const ticketPromedio = totalVentas > 0 ? Number((montoTotal / totalVentas).toFixed(2)) : 0;

    // Desglose por Método de Pago
    const metodosMap = new Map<string, { metodoPagoId: number; total: number; cantidad: number }>();
    for (const p of pedidos) {
      const nombreMetodo = p.metodoPago?.nombre || 'OTRO';
      const mId = p.metodoPago?.metodoPagoId || 0;
      const actual = metodosMap.get(nombreMetodo) || { metodoPagoId: mId, total: 0, cantidad: 0 };
      actual.total += Number(p.total);
      actual.cantidad += 1;
      metodosMap.set(nombreMetodo, actual);
    }

    const porMetodoPago = Array.from(metodosMap.entries()).map(([metodo, data], idx) => ({
      metodoPagoId: data.metodoPagoId || idx + 1,
      nombre: metodo,
      metodo,
      totalRecaudado: Number(data.total.toFixed(2)),
      total: Number(data.total.toFixed(2)),
      cantidadTransacciones: data.cantidad,
      cantidad: data.cantidad,
      porcentaje: montoTotal > 0 ? Number(((data.total / montoTotal) * 100).toFixed(1)) : 0,
    }));

    // Desglose por Sucursal
    const sucursalesMap = new Map<number, { nombre: string; total: number; cantidad: number }>();
    for (const p of pedidos) {
      const sucId = p.sucursalPreparacion?.sucursalId || 0;
      const sucNombre = p.sucursalPreparacion?.nombre || 'Sin sucursal';
      const actual = sucursalesMap.get(sucId) || { nombre: sucNombre, total: 0, cantidad: 0 };
      actual.total += Number(p.total);
      actual.cantidad += 1;
      sucursalesMap.set(sucId, actual);
    }

    const porSucursal = Array.from(sucursalesMap.entries()).map(([sucursalId, data]) => ({
      sucursalId,
      nombre: data.nombre,
      totalVentas: Number(data.total.toFixed(2)),
      total: Number(data.total.toFixed(2)),
      cantidadVentas: data.cantidad,
      cantidad: data.cantidad,
      porcentaje: montoTotal > 0 ? Number(((data.total / montoTotal) * 100).toFixed(1)) : 0,
    }));

    // Ventas de todo el periodo consultado
    const detalleVentas = pedidos.map((p) => ({
      pedidoId: p.pedidoId,
      fecha: p.fechaPedido,
      total: Number(p.total),
      estado: p.estado,
      metodoPago: p.metodoPago?.nombre || '—',
      sucursalNombre: p.sucursalPreparacion?.nombre || '—',
      clienteNombre: p.cliente ? `${p.cliente.nombre} ${p.cliente.apellido || ''}`.trim() : 'Consumidor Final',
      clienteNit: 'CF',
    }));

    return {
      kpis: {
        totalVentas,
        montoTotal: Number(montoTotal.toFixed(2)),
        baseImponible,
        ivaTotal,
        ticketPromedio,
      },
      porMetodoPago,
      desgloseMetodosPago: porMetodoPago,
      porSucursal,
      desgloseSucursales: porSucursal,
      detalleVentas,
      ventasListado: detalleVentas,
    };
  }

  /**
   * 2. REPORTE DE RIESGO DE CADUCIDAD Y MERMAS (AUDITORÍA FEFO)
   */
  async obtenerReporteCaducidadFefo(dto: QueryReportesDto) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const qb = this.inventarioRepo
      .createQueryBuilder('inv')
      .innerJoinAndSelect('inv.lote', 'lote')
      .innerJoinAndSelect('lote.producto', 'producto')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .innerJoinAndSelect('inv.sucursal', 'sucursal')
      .where('inv.cantidadDisponible > 0');

    if (dto.sucursalId) {
      qb.andWhere('inv.sucursalId = :sucId', { sucId: dto.sucursalId });
    }

    const inventarios = await qb.getMany();

    const lotesEnRiesgo: any[] = [];
    let costoTotalEnRiesgo = 0;
    let valorVentaEnRiesgo = 0;
    let unidadesTotalesEnRiesgo = 0;

    let lotesVencidosCount = 0;
    let costoVencidos = 0;
    let lotes30DiasCount = 0;
    let costo30Dias = 0;
    let lotes60DiasCount = 0;
    let costo60Dias = 0;
    let lotes90DiasCount = 0;
    let costo90Dias = 0;

    for (const inv of inventarios) {
      const lote = inv.lote;
      if (!lote?.fechaVencimiento) continue;

      const fVenc = new Date(lote.fechaVencimiento);
      fVenc.setHours(0, 0, 0, 0);
      const diffMs = fVenc.getTime() - hoy.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Solo nos interesan lotes con 90 días o menos (o ya vencidos)
      if (diasRestantes <= 90) {
        const cant = Number(inv.cantidadDisponible);
        const costoUnit = Number(lote.costoUnitario || 0);
        const precioUnit = Number(lote.producto?.precioVenta || 0);
        const costoSubtotal = Number((cant * costoUnit).toFixed(2));
        const ventaSubtotal = Number((cant * precioUnit).toFixed(2));

        costoTotalEnRiesgo += costoSubtotal;
        valorVentaEnRiesgo += ventaSubtotal;
        unidadesTotalesEnRiesgo += cant;

        let estadoRiesgo = 'PREVENTIVO_90D';
        let estadoUrgencia: 'VENCIDO' | 'CRITICO_30' | 'ALERTA_60' | 'PREVENCION_90' | 'NORMAL' = 'PREVENCION_90';
        let accionRecomendada = 'Monitoreo activo y dispensación preferente';

        if (diasRestantes <= 0) {
          estadoRiesgo = 'VENCIDO';
          estadoUrgencia = 'VENCIDO';
          accionRecomendada = 'Retiro inmediato de anaquel para merma/incineración';
          lotesVencidosCount++;
          costoVencidos += costoSubtotal;
        } else if (diasRestantes <= 30) {
          estadoRiesgo = 'URGENTE_30D';
          estadoUrgencia = 'CRITICO_30';
          accionRecomendada = 'Devolución urgente a proveedor o remate promocional';
          lotes30DiasCount++;
          costo30Dias += costoSubtotal;
        } else if (diasRestantes <= 60) {
          estadoRiesgo = 'ALERTA_60D';
          estadoUrgencia = 'ALERTA_60';
          accionRecomendada = 'Prioridad de dispensación FEFO en mostrador';
          lotes60DiasCount++;
          costo60Dias += costoSubtotal;
        } else {
          estadoRiesgo = 'PREVENTIVO_90D';
          estadoUrgencia = 'PREVENCION_90';
          accionRecomendada = 'Rotación preventiva a sucursales de alta demanda';
          lotes90DiasCount++;
          costo90Dias += costoSubtotal;
        }

        lotesEnRiesgo.push({
          loteId: lote.loteId,
          numeroLote: lote.numeroLote,
          productoId: lote.producto?.productoId,
          productoNombre: lote.producto?.nombre,
          codigoProducto: lote.producto?.codigoProducto,
          presentacion: lote.producto?.presentacion || '—',
          concentracion: lote.producto?.concentracion || '—',
          laboratorioNombre: lote.producto?.laboratorio?.nombre || 'Genérico',
          sucursalId: inv.sucursal?.sucursalId,
          sucursalNombre: inv.sucursal?.nombre,
          fechaVencimiento: lote.fechaVencimiento,
          diasRestantes,
          estadoRiesgo,
          estadoUrgencia,
          accionRecomendada,
          stockActual: cant,
          cantidadDisponible: cant,
          precioCosto: costoUnit,
          costoUnitario: costoUnit,
          costoRiesgo: costoSubtotal,
          costoTotalEnRiesgo: costoSubtotal,
          precioVenta: precioUnit,
          valorVentaEnRiesgo: ventaSubtotal,
        });
      }
    }

    // Ordenar de mayor a menor urgencia (días restantes ascendente)
    lotesEnRiesgo.sort((a, b) => a.diasRestantes - b.diasRestantes);

    return {
      kpis: {
        totalLotesRiesgo: lotesEnRiesgo.length,
        unidadesTotalesRiesgo: unidadesTotalesEnRiesgo,
        costoTotalEnRiesgo: Number(costoTotalEnRiesgo.toFixed(2)),
        valorVentaEnRiesgo: Number(valorVentaEnRiesgo.toFixed(2)),
        lotesVencidosCount,
        costoVencidos: Number(costoVencidos.toFixed(2)),
        lotes30DiasCount,
        costo30Dias: Number(costo30Dias.toFixed(2)),
        lotes60DiasCount,
        costo60Dias: Number(costo60Dias.toFixed(2)),
        lotes90DiasCount,
        costo90Dias: Number(costo90Dias.toFixed(2)),
      },
      lotes: lotesEnRiesgo,
    };
  }

  /**
   * 3. VALORACIÓN GLOBAL DE INVENTARIO
   */
  async obtenerReporteValoracionInventario(dto: QueryReportesDto) {
    const qb = this.inventarioRepo
      .createQueryBuilder('inv')
      .innerJoinAndSelect('inv.lote', 'lote')
      .innerJoinAndSelect('lote.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .innerJoinAndSelect('inv.sucursal', 'sucursal')
      .where('inv.cantidadDisponible > 0');

    if (dto.sucursalId) {
      qb.andWhere('inv.sucursalId = :sucId', { sucId: dto.sucursalId });
    }

    const inventarios = await qb.getMany();

    let costoTotalInventario = 0;
    let valorVentaEstimado = 0;
    let totalUnidadesFisicas = 0;
    const productosSet = new Set<number>();
    const lotesSet = new Set<number>();

    // Agrupaciones
    const sucursalesMap = new Map<number, {
      nombre: string;
      tipoSucursal: string;
      unidades: number;
      costoTotal: number;
      valorVenta: number;
      lotesCount: number;
    }>();

    const categoriasMap = new Map<string, {
      unidades: number;
      costoTotal: number;
      valorVenta: number;
    }>();

    for (const inv of inventarios) {
      const cant = Number(inv.cantidadDisponible);
      const costo = Number(inv.lote?.costoUnitario || 0);
      const precio = Number(inv.lote?.producto?.precioVenta || 0);
      const costoSub = cant * costo;
      const ventaSub = cant * precio;

      costoTotalInventario += costoSub;
      valorVentaEstimado += ventaSub;
      totalUnidadesFisicas += cant;

      if (inv.lote?.producto?.productoId) {
        productosSet.add(inv.lote.producto.productoId);
      }
      if (inv.lote?.loteId) {
        lotesSet.add(inv.lote.loteId);
      }

      // Por Sucursal
      const sId = inv.sucursal?.sucursalId || 0;
      const sNombre = inv.sucursal?.nombre || '—';
      const sTipo = inv.sucursal?.tipoSucursal || '—';
      const actualSuc = sucursalesMap.get(sId) || {
        nombre: sNombre,
        tipoSucursal: sTipo,
        unidades: 0,
        costoTotal: 0,
        valorVenta: 0,
        lotesCount: 0,
      };
      actualSuc.unidades += cant;
      actualSuc.costoTotal += costoSub;
      actualSuc.valorVenta += ventaSub;
      actualSuc.lotesCount += 1;
      sucursalesMap.set(sId, actualSuc);

      // Por Categoría
      const catNombre = inv.lote?.producto?.categoria?.nombre || 'General / Sin categoría';
      const actualCat = categoriasMap.get(catNombre) || {
        unidades: 0,
        costoTotal: 0,
        valorVenta: 0,
      };
      actualCat.unidades += cant;
      actualCat.costoTotal += costoSub;
      actualCat.valorVenta += ventaSub;
      categoriasMap.set(catNombre, actualCat);
    }

    const margenGananciaEstimado = valorVentaEstimado - costoTotalInventario;
    const porcentajeMargenBruto =
      valorVentaEstimado > 0 ? Number(((margenGananciaEstimado / valorVentaEstimado) * 100).toFixed(1)) : 0;

    // Formatear Desglose por Sucursal
    const desgloseSucursales = Array.from(sucursalesMap.entries()).map(([sucursalId, data]) => {
      const margen = data.valorVenta - data.costoTotal;
      const margenPct = data.valorVenta > 0 ? Number(((margen / data.valorVenta) * 100).toFixed(1)) : 0;
      return {
        sucursalId,
        nombre: data.nombre,
        tipoSucursal: data.tipoSucursal,
        unidades: data.unidades,
        stockTotal: data.unidades,
        lotesCount: data.lotesCount,
        totalItems: data.lotesCount,
        costoTotal: Number(data.costoTotal.toFixed(2)),
        valorVenta: Number(data.valorVenta.toFixed(2)),
        valorVentaTotal: Number(data.valorVenta.toFixed(2)),
        margen: Number(margen.toFixed(2)),
        gananciaEstimada: Number(margen.toFixed(2)),
        margenPct,
        porcentajeDelInventario:
          costoTotalInventario > 0 ? Number(((data.costoTotal / costoTotalInventario) * 100).toFixed(1)) : 0,
      };
    });

    // Formatear Desglose por Categoría
    const porCategoria = Array.from(categoriasMap.entries())
      .map(([categoria, data], idx) => ({
        categoriaId: idx + 1,
        categoriaNombre: categoria,
        categoria,
        unidades: data.unidades,
        stockTotal: data.unidades,
        totalItems: data.unidades,
        costoTotal: Number(data.costoTotal.toFixed(2)),
        valorVenta: Number(data.valorVenta.toFixed(2)),
        valorVentaTotal: Number(data.valorVenta.toFixed(2)),
      }))
      .sort((a, b) => b.costoTotal - a.costoTotal);

    // Detalle individual de inventario
    const detalleInventario = inventarios.map((inv) => {
      const cant = Number(inv.cantidadDisponible);
      const costo = Number(inv.lote?.costoUnitario || 0);
      const precio = Number(inv.lote?.producto?.precioVenta || 0);
      const cTot = Number((cant * costo).toFixed(2));
      const vTot = Number((cant * precio).toFixed(2));
      const ganancia = Number((vTot - cTot).toFixed(2));
      const margen = vTot > 0 ? Number(((ganancia / vTot) * 100).toFixed(1)) : 0;

      return {
        inventarioId: inv.inventarioId,
        productoId: inv.lote?.producto?.productoId,
        productoNombre: inv.lote?.producto?.nombre || '—',
        categoriaNombre: inv.lote?.producto?.categoria?.nombre || 'General',
        sucursalId: inv.sucursal?.sucursalId,
        sucursalNombre: inv.sucursal?.nombre || '—',
        stockActual: cant,
        stockMinimo: Number(inv.stockMinimo || 0),
        stockMaximo: Number(inv.stockMaximo || 0),
        precioCosto: costo,
        precioVenta: precio,
        costoTotal: cTot,
        valorVentaTotal: vTot,
        gananciaEstimada: ganancia,
        margenPct: margen,
      };
    });

    return {
      kpis: {
        costoTotalInventario: Number(costoTotalInventario.toFixed(2)),
        valorVentaEstimado: Number(valorVentaEstimado.toFixed(2)),
        valorTotalVentaPVP: Number(valorVentaEstimado.toFixed(2)),
        margenGananciaEstimado: Number(margenGananciaEstimado.toFixed(2)),
        gananciaPotencial: Number(margenGananciaEstimado.toFixed(2)),
        porcentajeMargenBruto,
        margenGlobalPct: porcentajeMargenBruto,
        totalUnidadesFisicas,
        stockTotalUnidades: totalUnidadesFisicas,
        totalProductosDistintos: productosSet.size,
        totalItems: productosSet.size,
        totalLotesActivos: lotesSet.size,
      },
      porSucursal: desgloseSucursales,
      desgloseSucursales,
      porCategoria,
      desgloseCategorias: porCategoria,
      detalleInventario,
    };
  }

  /**
   * 4. TOP 10 MEDICAMENTOS MÁS VENDIDOS (ROTACIÓN Y DEMANDA)
   */
  async obtenerReporteTopProductos(dto: QueryReportesDto) {
    const { fechaInicio, fechaFin } = this.resolverRangoFechas(dto);
    const limite = dto.limite && dto.limite > 0 ? dto.limite : 10;

    const qb = this.pedidoDetalleRepo
      .createQueryBuilder('det')
      .innerJoinAndSelect('det.pedido', 'pedido')
      .innerJoinAndSelect('det.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .where("pedido.estado != 'CANCELADO'");

    if (dto.sucursalId) {
      qb.andWhere('pedido.sucursalPreparacionId = :sucId', { sucId: dto.sucursalId });
    }

    if (fechaInicio) {
      qb.andWhere('pedido.fechaPedido >= :inicio', { inicio: fechaInicio });
    }
    if (fechaFin) {
      qb.andWhere('pedido.fechaPedido <= :fin', { fin: fechaFin });
    }

    const detalles = await qb.getMany();

    const productosMap = new Map<number, {
      productoId: number;
      nombre: string;
      codigoProducto: string;
      presentacion: string;
      concentracion: string;
      categoria: string;
      laboratorio: string;
      unidadesVendidas: number;
      montoTotal: number;
      transaccionesSet: Set<number>;
    }>();

    for (const d of detalles) {
      const prod = d.producto;
      if (!prod) continue;

      const pId = prod.productoId;
      const actual = productosMap.get(pId) || {
        productoId: pId,
        nombre: prod.nombre,
        codigoProducto: prod.codigoProducto,
        presentacion: prod.presentacion || '—',
        concentracion: prod.concentracion || '—',
        categoria: prod.categoria?.nombre || 'General',
        laboratorio: prod.laboratorio?.nombre || '—',
        unidadesVendidas: 0,
        montoTotal: 0,
        transaccionesSet: new Set<number>(),
      };

      actual.unidadesVendidas += Number(d.cantidad);
      actual.montoTotal += Number(d.subtotal);
      if (d.pedido?.pedidoId) {
        actual.transaccionesSet.add(d.pedido.pedidoId);
      }

      productosMap.set(pId, actual);
    }

    const totalUnidadesTop = Array.from(productosMap.values()).reduce((acc, p) => acc + p.unidadesVendidas, 0);
    const montoGeneradoTop = Array.from(productosMap.values()).reduce((acc, p) => acc + p.montoTotal, 0);

    const mapearItem = (p: any, idx: number) => {
      const pct = montoGeneradoTop > 0 ? Number(((p.montoTotal / montoGeneradoTop) * 100).toFixed(1)) : 0;
      const precioVenta = p.unidadesVendidas > 0 ? Number((p.montoTotal / p.unidadesVendidas).toFixed(2)) : 0;
      return {
        posicion: idx + 1,
        productoId: p.productoId,
        nombre: p.nombre,
        codigoBarras: p.codigoProducto || 'N/A',
        codigoProducto: p.codigoProducto,
        precioVentaActual: precioVenta,
        presentacion: p.presentacion,
        concentracion: p.concentracion,
        categoria: p.categoria,
        laboratorio: p.laboratorio,
        unidadesVendidas: p.unidadesVendidas,
        montoTotalGenerado: Number(p.montoTotal.toFixed(2)),
        montoTotal: Number(p.montoTotal.toFixed(2)),
        totalTransacciones: p.transaccionesSet.size,
        porcentajeIngresos: pct,
      };
    };

    const topPorUnidades = [...Array.from(productosMap.values())]
      .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
      .slice(0, limite)
      .map(mapearItem);

    const topPorIngresos = [...Array.from(productosMap.values())]
      .sort((a, b) => b.montoTotal - a.montoTotal)
      .slice(0, limite)
      .map(mapearItem);

    return {
      kpis: {
        totalProductosVendidos: productosMap.size,
        totalUnidadesVendidas: totalUnidadesTop,
        totalUnidadesTop,
        ingresosTotalesTop: Number(montoGeneradoTop.toFixed(2)),
        montoGeneradoTop: Number(montoGeneradoTop.toFixed(2)),
        productoEstrella: topPorUnidades.length > 0 ? topPorUnidades[0].nombre : 'Ninguno',
      },
      topProductos: topPorUnidades,
      topPorUnidades,
      topPorIngresos,
    };
  }

  /**
   * 5. REPORTE DE ARQUEOS Y CUADRE DE CAJAS
   */
  async obtenerReporteCuadreCajas(dto: QueryReportesDto) {
    const { fechaInicio, fechaFin } = this.resolverRangoFechas(dto);

    const qb = this.sesionCajaRepo
      .createQueryBuilder('sesion')
      .innerJoinAndSelect('sesion.caja', 'caja')
      .innerJoinAndSelect('caja.sucursal', 'sucursal')
      .leftJoinAndSelect('sesion.empleadoApertura', 'empApertura')
      .leftJoinAndSelect('sesion.empleadoCierre', 'empCierre');

    if (dto.sucursalId) {
      qb.andWhere('caja.sucursalId = :sucId', { sucId: dto.sucursalId });
    }

    if (fechaInicio) {
      qb.andWhere('sesion.fechaApertura >= :inicio', { inicio: fechaInicio });
    }
    if (fechaFin) {
      qb.andWhere('sesion.fechaApertura <= :fin', { fin: fechaFin });
    }

    qb.orderBy('sesion.fechaApertura', 'DESC');

    const sesiones = await qb.getMany();

    let totalEfectivoIngresado = 0;
    let totalFaltantes = 0;
    let totalSobrantes = 0;
    let sesionesCerradas = 0;
    let sesionesAbiertas = 0;
    let sesionesCuadradasExactas = 0;

    const listado = sesiones.map((s) => {
      const estaCerrada = s.estado === 'CERRADA';
      if (estaCerrada) {
        sesionesCerradas++;
      } else {
        sesionesAbiertas++;
      }

      const saldoInicial = Number(s.saldoInicial || 0);
      const totalIngresos = Number(s.totalIngresos || 0);
      totalEfectivoIngresado += totalIngresos;

      const dif = s.diferencia !== null && s.diferencia !== undefined ? Number(s.diferencia) : null;
      let resultadoCuadre = 'EN_CURSO';
      let estadoDiferencia: 'ABIERTA' | 'CUADRADA' | 'SOBRANTE' | 'FALTANTE' = 'ABIERTA';

      if (estaCerrada) {
        if (dif === 0 || Math.abs(dif || 0) < 0.01) {
          resultadoCuadre = 'EXACTO';
          estadoDiferencia = 'CUADRADA';
          sesionesCuadradasExactas++;
        } else if ((dif || 0) < 0) {
          resultadoCuadre = 'FALTANTE';
          estadoDiferencia = 'FALTANTE';
          totalFaltantes += Math.abs(dif || 0);
        } else {
          resultadoCuadre = 'SOBRANTE';
          estadoDiferencia = 'SOBRANTE';
          totalSobrantes += (dif || 0);
        }
      }

      const cajero = `${s.empleadoApertura?.nombre || ''} ${s.empleadoApertura?.apellido || ''}`.trim() || '—';
      const cajaId = s.caja?.cajaId || 0;
      const cajaNombre = s.caja?.codigoCaja || `Caja #${cajaId}`;
      const sucNombre = s.caja?.sucursal?.nombre || '—';

      return {
        sesionId: s.sesionCajaId,
        sesionCajaId: s.sesionCajaId,
        cajaId,
        cajaNombre,
        codigoCaja: s.caja?.codigoCaja || '—',
        sucursalNombre: sucNombre,
        empleadoNombre: cajero,
        cajero,
        fechaApertura: s.fechaApertura,
        fechaCierre: s.fechaCierre,
        estado: s.estado,
        estadoSesion: s.estado,
        saldoInicial,
        montoApertura: saldoInicial,
        totalIngresos,
        montoVentasCalculado: totalIngresos,
        efectivoEsperado: s.efectivoEsperado !== null ? Number(s.efectivoEsperado) : null,
        montoEfectivoEsperado: s.efectivoEsperado !== null ? Number(s.efectivoEsperado) : (saldoInicial + totalIngresos),
        efectivoContado: s.efectivoContado !== null ? Number(s.efectivoContado) : null,
        montoEfectivoReal: s.efectivoContado !== null ? Number(s.efectivoContado) : null,
        diferencia: dif,
        resultadoCuadre,
        estadoDiferencia,
        observacionCierre: s.observacionCierre,
      };
    });

    const porcentajeEfectividad =
      sesionesCerradas > 0 ? Number(((sesionesCuadradasExactas / sesionesCerradas) * 100).toFixed(1)) : 100;

    const sesionesConFaltante = sesiones.filter(s => s.estado === 'CERRADA' && Number(s.diferencia) < -0.01).length;
    const sesionesConSobrante = sesiones.filter(s => s.estado === 'CERRADA' && Number(s.diferencia) > 0.01).length;
    const diferenciaNetaTotal = Number((totalSobrantes - totalFaltantes).toFixed(2));
    const montoTotalAperturas = sesiones.reduce((acc, s) => acc + Number(s.saldoInicial || 0), 0);

    return {
      kpis: {
        totalSesiones: sesiones.length,
        sesionesCerradas,
        sesionesAbiertas,
        totalEfectivoIngresado: Number(totalEfectivoIngresado.toFixed(2)),
        montoTotalVentasCajas: Number(totalEfectivoIngresado.toFixed(2)),
        montoTotalAperturas: Number(montoTotalAperturas.toFixed(2)),
        diferenciaNetaTotal,
        totalFaltantes: Number(totalFaltantes.toFixed(2)),
        totalSobrantes: Number(totalSobrantes.toFixed(2)),
        sesionesCuadradas: sesionesCuadradasExactas,
        sesionesConFaltante,
        sesionesConSobrante,
        porcentajeEfectividadCuadre: porcentajeEfectividad,
      },
      sesiones: listado,
    };
  }
}
