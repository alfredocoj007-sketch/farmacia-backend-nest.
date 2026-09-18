import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivoFijo } from '../../database/entities/activo-fijo.entity';
import { CategoriaActivo } from '../../database/entities/categoria-activo.entity';
import { HistorialActivo } from '../../database/entities/historial-activo.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { CreateActivoFijoDto } from './dto/create-activo-fijo.dto';
import { TrasladarActivoDto } from './dto/trasladar-activo.dto';
import { MantenimientoActivoDto } from './dto/mantenimiento-activo.dto';
import { QueryActivoFijoDto } from './dto/query-activo-fijo.dto';

@Injectable()
export class ActivosFijosService {
  private readonly logger = new Logger(ActivosFijosService.name);

  constructor(
    @InjectRepository(ActivoFijo)
    private readonly activoRepo: Repository<ActivoFijo>,
    @InjectRepository(CategoriaActivo)
    private readonly categoriaRepo: Repository<CategoriaActivo>,
    @InjectRepository(HistorialActivo)
    private readonly historialRepo: Repository<HistorialActivo>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
  ) {}

  /**
   * Calcula la depreciación lineal exacta y el valor neto en libros.
   */
  private calcularDepreciacion(
    valorAdquisicion: number,
    valorResidual: number,
    vidaUtilMeses: number,
    fechaAdquisicion: Date,
  ) {
    const ahora = new Date();
    const fechaAdq = new Date(fechaAdquisicion);
    const mesesUso = Math.max(
      0,
      (ahora.getFullYear() - fechaAdq.getFullYear()) * 12 + (ahora.getMonth() - fechaAdq.getMonth()),
    );
    const montoDepreciable = Math.max(0, valorAdquisicion - (valorResidual || 0));
    const depreciacionMensual = vidaUtilMeses > 0 ? montoDepreciable / vidaUtilMeses : 0;
    const depreciacionTotal = Math.min(montoDepreciable, depreciacionMensual * mesesUso);
    const depreciacionAcumulada = Number(depreciacionTotal.toFixed(2));
    const valorLibros = Number(Math.max(valorResidual || 0, valorAdquisicion - depreciacionAcumulada).toFixed(2));
    const porcentajeDepreciado =
      montoDepreciable > 0 ? Number(((depreciacionAcumulada / montoDepreciable) * 100).toFixed(1)) : 100;

    return {
      depreciacionAcumulada,
      valorLibros,
      mesesUso,
      mesesRestantes: Math.max(0, vidaUtilMeses - mesesUso),
      porcentajeDepreciado,
    };
  }

  /**
   * Catálogo de categorías de activos. Si la base de datos está vacía, inicializa las categorías corporativas.
   */
  async listarCategorias(): Promise<CategoriaActivo[]> {
    let categorias = await this.categoriaRepo.find({
      order: { categoriaActivoId: 'ASC' },
    });

    if (categorias.length === 0) {
      const defaults = [
        { nombre: 'EQUIPO DE CADENA DE FRÍO', vidaUtilMeses: 60, estado: 'ACTIVO' },
        { nombre: 'TERMINALES POS Y COMPUTACIÓN', vidaUtilMeses: 36, estado: 'ACTIVO' },
        { nombre: 'EQUIPAMIENTO DE SUCURSAL / STAND', vidaUtilMeses: 120, estado: 'ACTIVO' },
        { nombre: 'SISTEMAS ELÉCTRICOS Y RESPALDO (UPS / GENERADORES)', vidaUtilMeses: 60, estado: 'ACTIVO' },
        { nombre: 'CLIMATIZACIÓN Y SEGURIDAD AMBIENTAL', vidaUtilMeses: 60, estado: 'ACTIVO' },
      ];

      for (const d of defaults) {
        const cat = this.categoriaRepo.create(d);
        await this.categoriaRepo.save(cat);
      }

      categorias = await this.categoriaRepo.find({ order: { categoriaActivoId: 'ASC' } });
      this.logger.log(`Inicializadas ${categorias.length} categorías de activos fijos`);
    }

    return categorias;
  }

  /**
   * Auto-seed de activos de prueba para auditoría y demostración de stands y centros comerciales.
   */
  private async autoSeedActivosSiEstaVacio(): Promise<void> {
    const total = await this.activoRepo.count();
    if (total > 0) return;

    const categorias = await this.listarCategorias();
    const sucursales = await this.sucursalRepo.find({ take: 5 });
    if (sucursales.length === 0 || categorias.length === 0) return;

    const suc1 = sucursales[0];
    const suc2 = sucursales.length > 1 ? sucursales[1] : sucursales[0];
    const suc3 = sucursales.length > 2 ? sucursales[2] : sucursales[0];

    const catFrio = categorias.find((c) => c.nombre.includes('FRÍO')) || categorias[0];
    const catPos = categorias.find((c) => c.nombre.includes('POS')) || categorias[0];
    const catElec = categorias.find((c) => c.nombre.includes('ELÉCTRICOS')) || categorias[0];
    const catEquip = categorias.find((c) => c.nombre.includes('EQUIPAMIENTO')) || categorias[0];

    const activosSeed = [
      {
        codigoActivo: 'ACT-CFR-001',
        descripcion: 'Refrigerador Farmacéutico de Grado Médico con Monitor de Temperatura IoT',
        marca: 'Liebherr',
        modelo: 'MedLine MKv 3910',
        numeroSerie: 'LB-992182-GT',
        fechaAdquisicion: new Date('2025-03-15'),
        valorAdquisicion: 28500.0,
        valorResidual: 2850.0,
        estado: 'ACTIVO',
        categoriaActivo: catFrio,
        sucursal: suc1,
      },
      {
        codigoActivo: 'ACT-POS-002',
        descripcion: 'Terminal All-in-One POS Touchscreen con Escáner 2D e Impresora Térmica',
        marca: 'Elo Touch',
        modelo: 'I-Series 4.0 Core i5',
        numeroSerie: 'ELO-88371-XC',
        fechaAdquisicion: new Date('2025-06-10'),
        valorAdquisicion: 12400.0,
        valorResidual: 1200.0,
        estado: 'ACTIVO',
        categoriaActivo: catPos,
        sucursal: suc1,
      },
      {
        codigoActivo: 'ACT-GEN-003',
        descripcion: 'Generador Diésel Insonorizado de Emergencia 15 kVA para Respaldo Ininterrumpido',
        marca: 'Cummins',
        modelo: 'Silent Power C15D5',
        numeroSerie: 'CUM-2024-8841',
        fechaAdquisicion: new Date('2024-11-20'),
        valorAdquisicion: 65000.0,
        valorResidual: 6500.0,
        estado: 'ACTIVO',
        categoriaActivo: catElec,
        sucursal: suc2,
      },
      {
        codigoActivo: 'ACT-EST-004',
        descripcion: 'Módulo de Despacho y Vitrina Blindada de Alta Seguridad para Medicamentos Controlados',
        marca: 'SteelMed',
        modelo: 'ArmorPharm Stand V-2',
        numeroSerie: 'SM-2025-0042',
        fechaAdquisicion: new Date('2025-01-08'),
        valorAdquisicion: 18900.0,
        valorResidual: 1890.0,
        estado: 'ACTIVO',
        categoriaActivo: catEquip,
        sucursal: suc3,
      },
      {
        codigoActivo: 'ACT-POS-005',
        descripcion: 'Terminal POS Stand Isla Mall con Lector de Tarjetas Integrado',
        marca: 'HP',
        modelo: 'Engage One Pro',
        numeroSerie: 'HP-ENG-77312',
        fechaAdquisicion: new Date('2025-08-01'),
        valorAdquisicion: 14200.0,
        valorResidual: 1400.0,
        estado: 'EN_MANTENIMIENTO',
        categoriaActivo: catPos,
        sucursal: suc2,
      },
    ];

    for (const item of activosSeed) {
      const dep = this.calcularDepreciacion(
        item.valorAdquisicion,
        item.valorResidual,
        item.categoriaActivo.vidaUtilMeses,
        item.fechaAdquisicion,
      );

      const nuevo = this.activoRepo.create({
        ...item,
        depreciacionAcumulada: dep.depreciacionAcumulada,
        valorLibros: dep.valorLibros,
      });

      const guardado = await this.activoRepo.save(nuevo);

      const historial = this.historialRepo.create({
        activo: guardado,
        sucursalDestino: item.sucursal,
        tipoMovimiento: 'ALTA_INICIAL',
        valorLibros: item.valorAdquisicion,
        observacion: 'Alta inicial patrimonial en sucursal operativa',
        fechaMovimiento: item.fechaAdquisicion,
      });
      await this.historialRepo.save(historial);
    }

    this.logger.log(`Auto-seeded ${activosSeed.length} activos fijos de infraestructura`);
  }

  /**
   * Lista todos los activos fijos aplicando filtros opcionales y calculando la depreciación al día.
   */
  async listar(query: QueryActivoFijoDto) {
    await this.autoSeedActivosSiEstaVacio();

    const qb = this.activoRepo
      .createQueryBuilder('activo')
      .leftJoinAndSelect('activo.categoriaActivo', 'categoria')
      .leftJoinAndSelect('activo.sucursal', 'sucursal')
      .orderBy('activo.activoId', 'DESC');

    if (query.sucursalId) {
      qb.andWhere('sucursal.sucursalId = :sucursalId', { sucursalId: query.sucursalId });
    }

    if (query.categoriaActivoId) {
      qb.andWhere('categoria.categoriaActivoId = :catId', { catId: query.categoriaActivoId });
    }

    if (query.estado) {
      qb.andWhere('activo.estado = :estado', { estado: query.estado });
    }

    if (query.busqueda) {
      const term = `%${query.busqueda.toUpperCase().trim()}%`;
      qb.andWhere(
        '(UPPER(activo.codigoActivo) LIKE :term OR UPPER(activo.descripcion) LIKE :term OR UPPER(activo.marca) LIKE :term OR UPPER(activo.modelo) LIKE :term OR UPPER(activo.numeroSerie) LIKE :term)',
        { term },
      );
    }

    const items = await qb.getMany();

    return items.map((a) => {
      const dep = this.calcularDepreciacion(
        Number(a.valorAdquisicion),
        Number(a.valorResidual || 0),
        a.categoriaActivo?.vidaUtilMeses || 60,
        a.fechaAdquisicion,
      );

      return {
        activoId: a.activoId,
        codigoActivo: a.codigoActivo,
        descripcion: a.descripcion,
        marca: a.marca,
        modelo: a.modelo,
        numeroSerie: a.numeroSerie,
        fechaAdquisicion: a.fechaAdquisicion,
        valorAdquisicion: Number(a.valorAdquisicion),
        valorResidual: Number(a.valorResidual || 0),
        valorLibros: dep.valorLibros,
        depreciacionAcumulada: dep.depreciacionAcumulada,
        porcentajeDepreciado: dep.porcentajeDepreciado,
        mesesUso: dep.mesesUso,
        mesesRestantes: dep.mesesRestantes,
        estado: a.estado,
        categoria: a.categoriaActivo
          ? {
              categoriaActivoId: a.categoriaActivo.categoriaActivoId,
              nombre: a.categoriaActivo.nombre,
              vidaUtilMeses: a.categoriaActivo.vidaUtilMeses,
            }
          : null,
        sucursal: a.sucursal
          ? {
              sucursalId: a.sucursal.sucursalId,
              nombre: a.sucursal.nombre,
              tipoSucursal: a.sucursal.tipoSucursal,
              direccion: a.sucursal.direccion,
            }
          : null,
      };
    });
  }

  /**
   * Obtiene la ficha técnica completa de un activo con su historial de movimientos/traslados.
   */
  async obtenerPorId(activoId: number) {
    const activo = await this.activoRepo.findOne({
      where: { activoId },
      relations: {
        categoriaActivo: true,
        sucursal: true,
        historialActivos: {
          sucursalOrigen: true,
          sucursalDestino: true,
        },
      },
    });

    if (!activo) {
      throw new NotFoundException(`Activo fijo #${activoId} no encontrado`);
    }

    const dep = this.calcularDepreciacion(
      Number(activo.valorAdquisicion),
      Number(activo.valorResidual || 0),
      activo.categoriaActivo?.vidaUtilMeses || 60,
      activo.fechaAdquisicion,
    );

    const historialOrdenado = (activo.historialActivos || [])
      .sort((a, b) => new Date(b.fechaMovimiento).getTime() - new Date(a.fechaMovimiento).getTime())
      .map((h) => ({
        historialActivoId: h.historialActivoId,
        tipoMovimiento: h.tipoMovimiento,
        fechaMovimiento: h.fechaMovimiento,
        valorLibros: h.valorLibros !== null ? Number(h.valorLibros) : null,
        observacion: h.observacion,
        sucursalOrigen: h.sucursalOrigen
          ? { sucursalId: h.sucursalOrigen.sucursalId, nombre: h.sucursalOrigen.nombre }
          : null,
        sucursalDestino: h.sucursalDestino
          ? { sucursalId: h.sucursalDestino.sucursalId, nombre: h.sucursalDestino.nombre }
          : null,
      }));

    return {
      activoId: activo.activoId,
      codigoActivo: activo.codigoActivo,
      descripcion: activo.descripcion,
      marca: activo.marca,
      modelo: activo.modelo,
      numeroSerie: activo.numeroSerie,
      fechaAdquisicion: activo.fechaAdquisicion,
      valorAdquisicion: Number(activo.valorAdquisicion),
      valorResidual: Number(activo.valorResidual || 0),
      valorLibros: dep.valorLibros,
      depreciacionAcumulada: dep.depreciacionAcumulada,
      porcentajeDepreciado: dep.porcentajeDepreciado,
      mesesUso: dep.mesesUso,
      mesesRestantes: dep.mesesRestantes,
      estado: activo.estado,
      categoria: activo.categoriaActivo,
      sucursal: activo.sucursal,
      historial: historialOrdenado,
    };
  }

  /**
   * Da de alta un nuevo activo fijo incorporándolo al balance contable y al inventario de la sucursal.
   */
  async crear(dto: CreateActivoFijoDto) {
    const existeCodigo = await this.activoRepo.findOne({
      where: { codigoActivo: dto.codigoActivo.trim().toUpperCase() },
    });
    if (existeCodigo) {
      throw new BadRequestException(`Ya existe un activo con el código ${dto.codigoActivo}`);
    }

    if (dto.numeroSerie) {
      const existeSerie = await this.activoRepo.findOne({
        where: { numeroSerie: dto.numeroSerie.trim() },
      });
      if (existeSerie) {
        throw new BadRequestException(`Ya existe un activo con el número de serie ${dto.numeroSerie}`);
      }
    }

    const categoria = await this.categoriaRepo.findOne({
      where: { categoriaActivoId: dto.categoriaActivoId },
    });
    if (!categoria) {
      throw new NotFoundException(`Categoría #${dto.categoriaActivoId} no encontrada`);
    }

    const sucursal = await this.sucursalRepo.findOne({
      where: { sucursalId: dto.sucursalId },
    });
    if (!sucursal) {
      throw new NotFoundException(`Sucursal #${dto.sucursalId} no encontrada`);
    }

    const fechaAdq = new Date(dto.fechaAdquisicion);
    const dep = this.calcularDepreciacion(
      dto.valorAdquisicion,
      dto.valorResidual || 0,
      categoria.vidaUtilMeses,
      fechaAdq,
    );

    const nuevoActivo = this.activoRepo.create({
      codigoActivo: dto.codigoActivo.trim().toUpperCase(),
      descripcion: dto.descripcion.trim(),
      categoriaActivo: categoria,
      sucursal,
      marca: dto.marca?.trim() || null,
      modelo: dto.modelo?.trim() || null,
      numeroSerie: dto.numeroSerie?.trim() || null,
      fechaAdquisicion: fechaAdq,
      valorAdquisicion: dto.valorAdquisicion,
      valorResidual: dto.valorResidual || 0,
      depreciacionAcumulada: dep.depreciacionAcumulada,
      valorLibros: dep.valorLibros,
      estado: 'ACTIVO',
    });

    const guardado = await this.activoRepo.save(nuevoActivo);

    // Registro inicial en bitácora de historial
    const historial = this.historialRepo.create({
      activo: guardado,
      sucursalDestino: sucursal,
      tipoMovimiento: 'ALTA_INICIAL',
      valorLibros: dep.valorLibros,
      observacion: 'Alta e incorporación patrimonial a sucursal operativa',
      fechaMovimiento: new Date(),
    });
    await this.historialRepo.save(historial);

    this.logger.log(`Activo fijo creado: ${guardado.codigoActivo} - ${guardado.descripcion}`);
    return this.obtenerPorId(guardado.activoId);
  }

  /**
   * Traslada un activo fijo de una sucursal a otra con trazabilidad patrimonial.
   */
  async trasladar(activoId: number, dto: TrasladarActivoDto) {
    const activo = await this.activoRepo.findOne({
      where: { activoId },
      relations: { sucursal: true, categoriaActivo: true },
    });
    if (!activo) {
      throw new NotFoundException(`Activo fijo #${activoId} no encontrado`);
    }

    if (activo.estado === 'DE_BAJA') {
      throw new BadRequestException('No se puede trasladar un activo que ha sido dado de baja');
    }

    if (activo.sucursal?.sucursalId === dto.sucursalDestinoId) {
      throw new BadRequestException('El activo ya se encuentra asignado a la sucursal de destino seleccionada');
    }

    const sucursalDestino = await this.sucursalRepo.findOne({
      where: { sucursalId: dto.sucursalDestinoId },
    });
    if (!sucursalDestino) {
      throw new NotFoundException(`Sucursal destino #${dto.sucursalDestinoId} no encontrada`);
    }

    const sucursalOrigen = activo.sucursal;

    const dep = this.calcularDepreciacion(
      Number(activo.valorAdquisicion),
      Number(activo.valorResidual || 0),
      activo.categoriaActivo?.vidaUtilMeses || 60,
      activo.fechaAdquisicion,
    );

    // Registrar en Historial
    const historial = this.historialRepo.create({
      activo,
      sucursalOrigen,
      sucursalDestino,
      tipoMovimiento: 'TRASLADO',
      valorLibros: dep.valorLibros,
      observacion: dto.observacion?.trim() || `Traslado operativo de ${sucursalOrigen?.nombre} a ${sucursalDestino.nombre}`,
      fechaMovimiento: new Date(),
    });
    await this.historialRepo.save(historial);

    // Actualizar sucursal en activo
    activo.sucursal = sucursalDestino;
    activo.depreciacionAcumulada = dep.depreciacionAcumulada;
    activo.valorLibros = dep.valorLibros;
    await this.activoRepo.save(activo);

    this.logger.log(
      `Activo ${activo.codigoActivo} trasladado exitosamente a sucursal ${sucursalDestino.nombre}`,
    );

    return this.obtenerPorId(activo.activoId);
  }

  /**
   * Actualiza el estado operativo (Mantenimiento, Activo, Baja).
   */
  async registrarMantenimiento(activoId: number, dto: MantenimientoActivoDto) {
    const activo = await this.activoRepo.findOne({
      where: { activoId },
      relations: { sucursal: true, categoriaActivo: true },
    });
    if (!activo) {
      throw new NotFoundException(`Activo fijo #${activoId} no encontrado`);
    }

    const estadoAnterior = activo.estado;
    activo.estado = dto.estado;

    const dep = this.calcularDepreciacion(
      Number(activo.valorAdquisicion),
      Number(activo.valorResidual || 0),
      activo.categoriaActivo?.vidaUtilMeses || 60,
      activo.fechaAdquisicion,
    );
    activo.depreciacionAcumulada = dep.depreciacionAcumulada;
    activo.valorLibros = dep.valorLibros;
    await this.activoRepo.save(activo);

    const tipoMov = dto.estado === 'DE_BAJA' ? 'BAJA' : 'MANTENIMIENTO';
    const obs =
      dto.observacion?.trim() ||
      `Cambio de estado: ${estadoAnterior} -> ${dto.estado} (${tipoMov})`;

    const historial = this.historialRepo.create({
      activo,
      sucursalOrigen: activo.sucursal,
      tipoMovimiento: tipoMov,
      valorLibros: dep.valorLibros,
      observacion: obs,
      fechaMovimiento: new Date(),
    });
    await this.historialRepo.save(historial);

    this.logger.log(`Activo ${activo.codigoActivo} actualizado a estado: ${dto.estado}`);
    return this.obtenerPorId(activo.activoId);
  }

  /**
   * Resumen analítico y financiero de activos para gobierno corporativo y auditoría bursátil.
   */
  async obtenerEstadisticas() {
    await this.autoSeedActivosSiEstaVacio();

    const activos = await this.activoRepo.find({
      relations: { categoriaActivo: true, sucursal: true },
    });

    let inversionTotal = 0;
    let valorLibrosTotal = 0;
    let depreciacionAcumuladaTotal = 0;
    let totalOperativos = 0;
    let totalMantenimiento = 0;
    let totalBaja = 0;

    const porSucursalMap = new Map<number, { sucursalId: number; nombre: string; tipo: string; cantidad: number; valorLibros: number }>();
    const porCategoriaMap = new Map<number, { categoriaId: number; nombre: string; cantidad: number; valorLibros: number }>();

    for (const a of activos) {
      const adq = Number(a.valorAdquisicion);
      const res = Number(a.valorResidual || 0);
      const meses = a.categoriaActivo?.vidaUtilMeses || 60;
      const dep = this.calcularDepreciacion(adq, res, meses, a.fechaAdquisicion);

      inversionTotal += adq;
      valorLibrosTotal += dep.valorLibros;
      depreciacionAcumuladaTotal += dep.depreciacionAcumulada;

      if (a.estado === 'ACTIVO') totalOperativos++;
      else if (a.estado === 'EN_MANTENIMIENTO') totalMantenimiento++;
      else if (a.estado === 'DE_BAJA') totalBaja++;

      // Agrupación sucursal
      if (a.sucursal) {
        const suc = porSucursalMap.get(a.sucursal.sucursalId) || {
          sucursalId: a.sucursal.sucursalId,
          nombre: a.sucursal.nombre,
          tipo: a.sucursal.tipoSucursal,
          cantidad: 0,
          valorLibros: 0,
        };
        suc.cantidad++;
        suc.valorLibros = Number((suc.valorLibros + dep.valorLibros).toFixed(2));
        porSucursalMap.set(a.sucursal.sucursalId, suc);
      }

      // Agrupación categoría
      if (a.categoriaActivo) {
        const cat = porCategoriaMap.get(a.categoriaActivo.categoriaActivoId) || {
          categoriaId: a.categoriaActivo.categoriaActivoId,
          nombre: a.categoriaActivo.nombre,
          cantidad: 0,
          valorLibros: 0,
        };
        cat.cantidad++;
        cat.valorLibros = Number((cat.valorLibros + dep.valorLibros).toFixed(2));
        porCategoriaMap.set(a.categoriaActivo.categoriaActivoId, cat);
      }
    }

    return {
      totalActivos: activos.length,
      totalOperativos,
      totalMantenimiento,
      totalBaja,
      inversionTotal: Number(inversionTotal.toFixed(2)),
      valorLibrosTotal: Number(valorLibrosTotal.toFixed(2)),
      depreciacionAcumuladaTotal: Number(depreciacionAcumuladaTotal.toFixed(2)),
      porSucursal: Array.from(porSucursalMap.values()),
      porCategoria: Array.from(porCategoriaMap.values()),
    };
  }
}
