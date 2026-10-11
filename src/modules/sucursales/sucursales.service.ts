import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Municipio } from '../../database/entities/municipio.entity';
import { Departamento } from '../../database/entities/departamento.entity';
import { Empleado } from '../../database/entities/empleado.entity';
import { Caja } from '../../database/entities/caja.entity';
import { Inventario } from '../../database/entities/inventario.entity';
import { ActivoFijo } from '../../database/entities/activo-fijo.entity';
import { AuditoriaEvento } from '../../database/entities/auditoria-evento.entity';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { QuerySucursalesDto } from './dto/query-sucursales.dto';
import { CreateDepartamentoDto } from './dto/create-departamento.dto';
import { CreateMunicipioDto } from './dto/create-municipio.dto';

@Injectable()
export class SucursalesService implements OnModuleInit {
  private readonly logger = new Logger(SucursalesService.name);

  constructor(
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,

    @InjectRepository(Municipio)
    private readonly municipioRepo: Repository<Municipio>,

    @InjectRepository(Departamento)
    private readonly departamentoRepo: Repository<Departamento>,

    @InjectRepository(Empleado)
    private readonly empleadoRepo: Repository<Empleado>,

    @InjectRepository(Caja)
    private readonly cajaRepo: Repository<Caja>,

    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,

    @InjectRepository(ActivoFijo)
    private readonly activoFijoRepo: Repository<ActivoFijo>,

    @InjectRepository(AuditoriaEvento)
    private readonly auditoriaRepo: Repository<AuditoriaEvento>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.autoSeedGeografiaSiEstaVacia();
      await this.autoSeedSucursalesIniciales();
    } catch (err) {
      this.logger.warn('Aviso en inicialización de sucursales:', err);
    }
  }

  /**
   * Consulta el listado enriquecido de puntos de venta con micro-KPIs en vivo.
   */
  async findAll(query?: QuerySucursalesDto): Promise<any[]> {
    const qb = this.sucursalRepo
      .createQueryBuilder('sucursal')
      .leftJoinAndSelect('sucursal.municipio', 'municipio')
      .leftJoinAndSelect('municipio.departamento', 'departamento');

    if (query?.tipoSucursal) {
      qb.andWhere('sucursal.tipoSucursal = :tipo', { tipo: query.tipoSucursal });
    }

    if (query?.estado) {
      qb.andWhere('sucursal.estado = :estado', { estado: query.estado });
    }

    if (query?.municipioId) {
      qb.andWhere('municipio.municipioId = :mId', { mId: query.municipioId });
    }

    if (query?.departamentoId) {
      qb.andWhere('departamento.departamentoId = :dId', { dId: query.departamentoId });
    }

    if (query?.busqueda && query.busqueda.trim()) {
      const b = `%${query.busqueda.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(sucursal.nombre) LIKE :b OR LOWER(sucursal.direccion) LIKE :b OR sucursal.telefono LIKE :b)',
        { b },
      );
    }

    qb.orderBy('sucursal.sucursalId', 'ASC');

    const sucursales = await qb.getMany();

    // Enriquecer en memoria con conteos operativos
    const resultado = await Promise.all(
      sucursales.map(async (s) => {
        const [totalEmpleados, totalCajas, invStats, totalActivos] = await Promise.all([
          this.empleadoRepo.count({
            where: { sucursal: { sucursalId: s.sucursalId }, estado: 'ACTIVO' },
          }),
          this.cajaRepo.count({
            where: { sucursal: { sucursalId: s.sucursalId }, estado: 'ACTIVA' },
          }),
          this.inventarioRepo
            .createQueryBuilder('inv')
            .leftJoin('inv.lote', 'lote')
            .select('SUM(inv.cantidadDisponible)', 'totalUnidades')
            .addSelect('SUM(inv.cantidadDisponible * lote.costoUnitario)', 'valorTotal')
            .where('inv.sucursalId = :sId', { sId: s.sucursalId })
            .getRawOne(),
          this.activoFijoRepo.count({
            where: { sucursal: { sucursalId: s.sucursalId } },
          }),
        ]);

        return {
          ...s,
          totalEmpleados: totalEmpleados || 0,
          totalCajas: totalCajas || 0,
          totalActivos: totalActivos || 0,
          totalStockUnidades: Number(invStats?.totalUnidades || 0),
          valorInventarioQ: Number(Number(invStats?.valorTotal || 0).toFixed(2)),
        };
      }),
    );

    return resultado;
  }

  /**
   * Obtiene el expediente técnico completo de una sucursal con personal, cajas, activos e inventario.
   */
  async findOne(id: number): Promise<any> {
    const sucursal = await this.sucursalRepo.findOne({
      where: { sucursalId: id },
      relations: {
        municipio: {
          departamento: true,
        },
      },
    });

    if (!sucursal) {
      throw new NotFoundException(`No se encontró la sucursal #${id}.`);
    }

    const [empleados, cajas, activosFijos, inventarioRows] = await Promise.all([
      this.empleadoRepo.find({
        where: { sucursal: { sucursalId: id } },
        relations: { puesto: true },
        order: { estado: 'ASC', nombre: 'ASC' },
      }),
      this.cajaRepo.find({
        where: { sucursal: { sucursalId: id } },
        relations: { sesionCajas: true },
        order: { codigoCaja: 'ASC' },
      }),
      this.activoFijoRepo.find({
        where: { sucursal: { sucursalId: id } },
        relations: { categoriaActivo: true },
        order: { valorAdquisicion: 'DESC' },
      }),
      this.inventarioRepo
        .createQueryBuilder('inv')
        .leftJoinAndSelect('inv.lote', 'lote')
        .leftJoinAndSelect('lote.producto', 'prod')
        .where('inv.sucursalId = :sId', { sId: id })
        .andWhere('inv.cantidadDisponible > 0')
        .orderBy('inv.cantidadDisponible', 'DESC')
        .take(15)
        .getMany(),
    ]);

    const totalStockUnidades = inventarioRows.reduce((acc, r) => acc + Number(r.cantidadDisponible || 0), 0);
    const totalValorInventario = inventarioRows.reduce(
      (acc, r) => acc + Number(r.cantidadDisponible || 0) * Number(r.lote?.costoUnitario || 0),
      0,
    );
    const totalValorActivos = activosFijos.reduce(
      (acc, a) => acc + Number(a.valorAdquisicion || 0),
      0,
    );

    return {
      sucursal,
      resumen: {
        totalEmpleados: empleados.length,
        empleadosActivos: empleados.filter((e) => e.estado === 'ACTIVO').length,
        totalCajas: cajas.length,
        cajasActivas: cajas.filter((c) => c.estado === 'ACTIVA').length,
        totalActivos: activosFijos.length,
        totalValorActivos: Number(totalValorActivos.toFixed(2)),
        totalItemsConStock: inventarioRows.length,
        totalStockUnidades,
        totalValorInventario: Number(totalValorInventario.toFixed(2)),
      },
      empleados: empleados.map((e) => ({
        empleadoId: e.empleadoId,
        nombreCompleto: `${e.nombre} ${e.apellido}`,
        puesto: e.puesto?.nombre || 'Sin Puesto',
        telefono: e.telefono || 'N/A',
        estado: e.estado,
        fechaIngreso: e.fechaIngreso,
      })),
      cajas: cajas.map((c) => ({
        cajaId: c.cajaId,
        codigoCaja: c.codigoCaja,
        descripcion: c.descripcion,
        estado: c.estado,
        ultimaSesion: c.sesionCajas && c.sesionCajas.length > 0 ? c.sesionCajas[c.sesionCajas.length - 1] : null,
      })),
      activosFijos: activosFijos.map((a) => ({
        activoId: a.activoId,
        codigoActivo: a.codigoActivo,
        descripcion: a.descripcion,
        marca: a.marca,
        modelo: a.modelo,
        categoria: a.categoriaActivo?.nombre || 'General',
        valorAdquisicion: a.valorAdquisicion,
        estado: a.estado,
      })),
      inventarioDestacado: inventarioRows.map((inv) => ({
        productoId: inv.lote?.producto?.productoId,
        nombre: inv.lote?.producto?.nombre,
        loteNumero: inv.lote?.numeroLote,
        fechaVencimiento: inv.lote?.fechaVencimiento,
        stockDisponible: inv.cantidadDisponible,
        costoUnitario: inv.lote?.costoUnitario,
        valorTotal: Number((Number(inv.cantidadDisponible) * Number(inv.lote?.costoUnitario || 0)).toFixed(2)),
      })),
    };
  }

  /**
   * Crea un nuevo punto de venta en la red.
   */
  async create(dto: CreateSucursalDto): Promise<Sucursal> {
    const existe = await this.sucursalRepo.findOne({
      where: { nombre: dto.nombre.trim() },
    });

    if (existe) {
      throw new BadRequestException(`Ya existe una sucursal con el nombre "${dto.nombre}".`);
    }

    const municipio = await this.municipioRepo.findOne({
      where: { municipioId: dto.municipioId },
      relations: { departamento: true },
    });

    if (!municipio) {
      throw new NotFoundException(`El municipio con ID #${dto.municipioId} no existe.`);
    }

    const nueva = this.sucursalRepo.create({
      nombre: dto.nombre.trim(),
      tipoSucursal: dto.tipoSucursal,
      direccion: dto.direccion.trim(),
      telefono: dto.telefono ? dto.telefono.trim() : null,
      latitud: dto.latitud ?? null,
      longitud: dto.longitud ?? null,
      estado: dto.estado || 'ACTIVA',
      fechaApertura: new Date(),
      municipio,
    });

    const guardada = await this.sucursalRepo.save(nueva);

    // Auditoría
    try {
      await this.auditoriaRepo.save(
        this.auditoriaRepo.create({
          modulo: 'SUCURSALES',
          operacion: 'INSERT',
          tablaAfectada: 'SUCURSAL',
          registroId: guardada.sucursalId,
          descripcion: `Alta de nuevo punto de venta: "${guardada.nombre}" (${guardada.tipoSucursal}) en ${municipio.nombre}, ${municipio.departamento?.nombre}.`,
          usuarioBd: 'FARMACIA_APP',
          ipCliente: '127.0.0.1',
          host: 'farma-client',
          fechaEvento: new Date(),
        }),
      );
    } catch (e) {
      this.logger.error('Error al auditar creación de sucursal:', e);
    }

    return guardada;
  }

  /**
   * Actualiza datos de la sucursal.
   */
  async update(id: number, dto: UpdateSucursalDto): Promise<Sucursal> {
    const sucursal = await this.sucursalRepo.findOne({
      where: { sucursalId: id },
      relations: { municipio: true },
    });

    if (!sucursal) {
      throw new NotFoundException(`No se encontró la sucursal #${id}.`);
    }

    if (dto.nombre && dto.nombre.trim() !== sucursal.nombre) {
      const existe = await this.sucursalRepo.findOne({
        where: { nombre: dto.nombre.trim() },
      });
      if (existe && existe.sucursalId !== id) {
        throw new BadRequestException(`Ya existe otra sucursal con el nombre "${dto.nombre}".`);
      }
      sucursal.nombre = dto.nombre.trim();
    }

    if (dto.tipoSucursal) sucursal.tipoSucursal = dto.tipoSucursal;
    if (dto.direccion) sucursal.direccion = dto.direccion.trim();
    if (dto.telefono !== undefined) sucursal.telefono = dto.telefono ? dto.telefono.trim() : null;
    if (dto.latitud !== undefined) sucursal.latitud = dto.latitud;
    if (dto.longitud !== undefined) sucursal.longitud = dto.longitud;
    if (dto.estado) sucursal.estado = dto.estado;

    if (dto.municipioId && dto.municipioId !== sucursal.municipio?.municipioId) {
      const mun = await this.municipioRepo.findOne({
        where: { municipioId: dto.municipioId },
      });
      if (!mun) {
        throw new NotFoundException(`El municipio #${dto.municipioId} no existe.`);
      }
      sucursal.municipio = mun;
    }

    const actualizada = await this.sucursalRepo.save(sucursal);

    // Auditoría
    try {
      await this.auditoriaRepo.save(
        this.auditoriaRepo.create({
          modulo: 'SUCURSALES',
          operacion: 'UPDATE',
          tablaAfectada: 'SUCURSAL',
          registroId: id,
          descripcion: `Modificación técnica de punto de venta: "${actualizada.nombre}" (Estado: ${actualizada.estado}).`,
          usuarioBd: 'FARMACIA_APP',
          ipCliente: '127.0.0.1',
          host: 'farma-client',
          fechaEvento: new Date(),
        }),
      );
    } catch (e) {
      this.logger.error('Error al auditar actualización de sucursal:', e);
    }

    return actualizada;
  }

  /**
   * Cambia el estado operativo de una sucursal (ACTIVA / INACTIVA / MANTENIMIENTO).
   */
  async cambiarEstado(id: number, estado: string): Promise<Sucursal> {
    const sucursal = await this.sucursalRepo.findOne({ where: { sucursalId: id } });
    if (!sucursal) {
      throw new NotFoundException(`No se encontró la sucursal #${id}.`);
    }

    sucursal.estado = estado.toUpperCase();
    const guardada = await this.sucursalRepo.save(sucursal);

    try {
      await this.auditoriaRepo.save(
        this.auditoriaRepo.create({
          modulo: 'SUCURSALES',
          operacion: 'UPDATE',
          tablaAfectada: 'SUCURSAL',
          registroId: id,
          descripcion: `Cambio de estado operativo de sucursal #${id} (${guardada.nombre}) a: ${guardada.estado}.`,
          usuarioBd: 'FARMACIA_APP',
          ipCliente: '127.0.0.1',
          host: 'farma-client',
          fechaEvento: new Date(),
        }),
      );
    } catch (e) {
      this.logger.error('Error al auditar cambio de estado:', e);
    }

    return guardada;
  }

  /**
   * Indicadores ejecutivos de la red comercial y logística.
   */
  async getEstadisticasRed(): Promise<any> {
    const [
      totalPuntosVenta,
      farmaciasMatriz,
      standsMall,
      standsGasolinera,
      activas,
      inactivas,
      totalEmpleadosRed,
      totalCajasRed,
      coberturaMun,
      coberturaDep,
    ] = await Promise.all([
      this.sucursalRepo.count(),
      this.sucursalRepo.count({ where: { tipoSucursal: 'FARMACIA' } }),
      this.sucursalRepo.count({ where: { tipoSucursal: 'MALL_STAND' } }),
      this.sucursalRepo.count({ where: { tipoSucursal: 'GAS_STAND' } }),
      this.sucursalRepo.count({ where: { estado: 'ACTIVA' } }),
      this.sucursalRepo.count({ where: { estado: 'INACTIVA' } }),
      this.empleadoRepo.count({ where: { estado: 'ACTIVO' } }),
      this.cajaRepo.count({ where: { estado: 'ACTIVA' } }),
      this.sucursalRepo
        .createQueryBuilder('s')
        .select('COUNT(DISTINCT s.municipio)', 'cnt')
        .getRawOne(),
      this.sucursalRepo
        .createQueryBuilder('s')
        .leftJoin('s.municipio', 'm')
        .select('COUNT(DISTINCT m.departamentoId)', 'cnt')
        .getRawOne(),
    ]);

    const distribucion = [
      {
        tipo: 'FARMACIA',
        label: 'Bodega Matriz / Farmacia Central',
        total: farmaciasMatriz,
        porcentaje: totalPuntosVenta > 0 ? Number(((farmaciasMatriz / totalPuntosVenta) * 100).toFixed(1)) : 0,
      },
      {
        tipo: 'MALL_STAND',
        label: 'Centros Comerciales',
        total: standsMall,
        porcentaje: totalPuntosVenta > 0 ? Number(((standsMall / totalPuntosVenta) * 100).toFixed(1)) : 0,
      },
      {
        tipo: 'GAS_STAND',
        label: 'Stands Express en Gasolineras (24/7)',
        total: standsGasolinera,
        porcentaje: totalPuntosVenta > 0 ? Number(((standsGasolinera / totalPuntosVenta) * 100).toFixed(1)) : 0,
      },
    ];

    return {
      totalPuntosVenta,
      farmaciasMatriz,
      standsMall,
      standsGasolinera,
      activas,
      inactivas,
      totalEmpleadosRed,
      totalCajasRed,
      municipiosCubiertos: Number(coberturaMun?.cnt || 1),
      departamentosCubiertos: Number(coberturaDep?.cnt || 1),
      distribucion,
    };
  }

  /**
   * Catálogo de Departamentos con sus Municipios.
   */
  async getDepartamentos(): Promise<Departamento[]> {
    return this.departamentoRepo.find({
      relations: { municipios: true },
      order: { nombre: 'ASC' },
    });
  }

  /**
   * Catálogo de Municipios (filtrable por departamento).
   */
  async getMunicipios(departamentoId?: number): Promise<Municipio[]> {
    if (departamentoId) {
      return this.municipioRepo.find({
        where: { departamentoId },
        relations: { departamento: true },
        order: { nombre: 'ASC' },
      });
    }

    return this.municipioRepo.find({
      relations: { departamento: true },
      order: { nombre: 'ASC' },
    });
  }

  /**
   * Registra un nuevo Departamento y opcionalmente su primer Municipio.
   */
  async createDepartamento(dto: CreateDepartamentoDto): Promise<Departamento> {
    const nombreLimpio = dto.nombre.trim();
    if (!nombreLimpio) {
      throw new BadRequestException('El nombre del departamento es obligatorio.');
    }

    const existe = await this.departamentoRepo
      .createQueryBuilder('d')
      .where('LOWER(d.nombre) = :nombre', { nombre: nombreLimpio.toLowerCase() })
      .getOne();

    if (existe) {
      throw new BadRequestException(`El departamento "${nombreLimpio}" ya existe en el sistema.`);
    }

    const dep = await this.departamentoRepo.save(
      this.departamentoRepo.create({ nombre: nombreLimpio }),
    );

    if (dto.municipioInicial && dto.municipioInicial.trim()) {
      const munLimpio = dto.municipioInicial.trim();
      await this.municipioRepo.save(
        this.municipioRepo.create({
          nombre: munLimpio,
          departamentoId: dep.departamentoId,
        }),
      );
    }

    return this.departamentoRepo.findOne({
      where: { departamentoId: dep.departamentoId },
      relations: { municipios: true },
    }) as Promise<Departamento>;
  }

  /**
   * Registra un nuevo Municipio bajo un Departamento existente.
   */
  async createMunicipio(dto: CreateMunicipioDto): Promise<Municipio> {
    const nombreLimpio = dto.nombre.trim();
    if (!nombreLimpio) {
      throw new BadRequestException('El nombre del municipio es obligatorio.');
    }

    const dep = await this.departamentoRepo.findOne({
      where: { departamentoId: dto.departamentoId },
    });
    if (!dep) {
      throw new NotFoundException(`El departamento con ID ${dto.departamentoId} no existe.`);
    }

    const existe = await this.municipioRepo
      .createQueryBuilder('m')
      .where('m.departamentoId = :depId AND LOWER(m.nombre) = :nombre', {
        depId: dto.departamentoId,
        nombre: nombreLimpio.toLowerCase(),
      })
      .getOne();

    if (existe) {
      throw new BadRequestException(
        `El municipio "${nombreLimpio}" ya existe en el departamento de ${dep.nombre}.`,
      );
    }

    const mun = await this.municipioRepo.save(
      this.municipioRepo.create({
        nombre: nombreLimpio,
        departamentoId: dep.departamentoId,
      }),
    );

    return this.municipioRepo.findOne({
      where: { municipioId: mun.municipioId },
      relations: { departamento: true },
    }) as Promise<Municipio>;
  }

  /**
   * Auto-siembra de departamentos y municipios comerciales de Guatemala si solo existe 1.
   */
  private async autoSeedGeografiaSiEstaVacia(): Promise<void> {
    const countDeps = await this.departamentoRepo.count();
    if (countDeps > 1) return;

    this.logger.log('Sembrando catálogo geográfico de Guatemala...');

    // 1. Departamentos adicionales
    const depsAInsertar = [
      { nombre: 'Sacatepéquez', municipios: ['Antigua Guatemala', 'San Lucas Sacatepéquez', 'Ciudad Vieja'] },
      { nombre: 'Quetzaltenango', municipios: ['Quetzaltenango', 'Salcajá', 'Coatepeque'] },
      { nombre: 'Escuintla', municipios: ['Escuintla', 'Puerto San José', 'Palín'] },
    ];

    // Municipios adicionales para departamento de Guatemala (ID 1)
    const depGuate = await this.departamentoRepo.findOne({ where: { departamentoId: 1 } });
    if (depGuate) {
      const munsGuate = ['Mixco', 'Santa Catarina Pinula', 'Villa Nueva', 'San Miguel Petapa', 'Fraijanes'];
      for (const mNombre of munsGuate) {
        const existeMun = await this.municipioRepo.findOne({ where: { nombre: mNombre } });
        if (!existeMun) {
          await this.municipioRepo.save(
            this.municipioRepo.create({
              nombre: mNombre,
              departamentoId: 1,
            }),
          );
        }
      }
    }

    for (const d of depsAInsertar) {
      const existeDep = await this.departamentoRepo.findOne({ where: { nombre: d.nombre } });
      let depEntidad = existeDep;
      if (!depEntidad) {
        depEntidad = await this.departamentoRepo.save(this.departamentoRepo.create({ nombre: d.nombre }));
      }

      for (const mNombre of d.municipios) {
        const existeMun = await this.municipioRepo.findOne({ where: { nombre: mNombre } });
        if (!existeMun) {
          await this.municipioRepo.save(
            this.municipioRepo.create({
              nombre: mNombre,
              departamentoId: depEntidad.departamentoId,
            }),
          );
        }
      }
    }

    this.logger.log('Catálogo geográfico de Guatemala sembrado con éxito.');
  }

  /**
   * Asegura que existan al menos 4 sucursales representativas.
   */
  private async autoSeedSucursalesIniciales(): Promise<void> {
    const total = await this.sucursalRepo.count();
    if (total > 0) return;

    const central = await this.sucursalRepo.findOne({
      where: { sucursalId: 1 },
      relations: { municipio: true },
    });

    const nuevas = [
      {
        nombre: 'Sucursal Mall Miraflores (Isla Stand Nivel 1)',
        tipoSucursal: 'MALL_STAND',
        direccion: 'Centro Comercial Miraflores, Kiosko K-104, Zona 11',
        telefono: '2470-1122',
        estado: 'ACTIVA',
        latitud: 14.6186,
        longitud: -90.5574,
        fechaApertura: new Date('2025-02-01'),
        municipio: central?.municipio,
      },
      {
        nombre: 'Stand Express Gasolinera Roosevelt',
        tipoSucursal: 'GAS_STAND',
        direccion: 'Calzada Roosevelt 22-50, Zona 7 (Estación Puma)',
        telefono: '2470-3344',
        estado: 'ACTIVA',
        latitud: 14.6295,
        longitud: -90.5482,
        fechaApertura: new Date('2025-05-10'),
        municipio: central?.municipio,
      },
      {
        nombre: 'Sucursal Oakland Mall Gourmet',
        tipoSucursal: 'MALL_STAND',
        direccion: 'Oakland Mall, Planta Baja Local PB-12, Zona 10',
        telefono: '2337-8899',
        estado: 'ACTIVA',
        latitud: 14.5991,
        longitud: -90.5132,
        fechaApertura: new Date('2025-09-01'),
        municipio: central?.municipio,
      },
    ];

    for (const n of nuevas) {
      const existe = await this.sucursalRepo.findOne({ where: { nombre: n.nombre } });
      if (!existe) {
        await this.sucursalRepo.save(this.sucursalRepo.create(n as any));
      }
    }
  }
}
