import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaEvento } from '../../database/entities/auditoria-evento.entity';
import { Credencial } from '../../database/entities/credencial.entity';
import { Rol } from '../../database/entities/rol.entity';
import { QueryAuditoriaDto } from './dto/query-auditoria.dto';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';

@Injectable()
export class AuditoriaService implements OnModuleInit {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(AuditoriaEvento)
    private readonly auditoriaRepo: Repository<AuditoriaEvento>,

    @InjectRepository(Credencial)
    private readonly credencialRepo: Repository<Credencial>,

    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
  ) {}

  async onModuleInit() {
    try {
      await this.autoSeedAuditoriaSiEstaVacia();
    } catch (error) {
      this.logger.warn('Error durante auto-seed de auditoría:', error);
    }
  }

  /**
   * Consulta paginada de la bitácora con múltiples filtros forenses.
   */
  async listarEventos(query: QueryAuditoriaDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const qb = this.auditoriaRepo.createQueryBuilder('auditoria');

    if (query.modulo) {
      qb.andWhere('auditoria.modulo = :modulo', { modulo: query.modulo.toUpperCase() });
    }

    if (query.operacion) {
      qb.andWhere('auditoria.operacion = :operacion', { operacion: query.operacion.toUpperCase() });
    }

    if (query.tablaAfectada) {
      qb.andWhere('auditoria.tablaAfectada = :tabla', { tabla: query.tablaAfectada.toUpperCase() });
    }

    if (query.usuarioBd) {
      qb.andWhere('LOWER(auditoria.usuarioBd) = LOWER(:usuarioBd)', { usuarioBd: query.usuarioBd });
    }

    if (query.clientIdentifier) {
      qb.andWhere('LOWER(auditoria.clientIdentifier) = LOWER(:clientIdentifier)', {
        clientIdentifier: query.clientIdentifier,
      });
    }

    if (query.ipCliente) {
      qb.andWhere('auditoria.ipCliente = :ipCliente', { ipCliente: query.ipCliente });
    }

    if (query.fechaInicio) {
      let fInicio: Date;
      if (typeof query.fechaInicio === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.fechaInicio)) {
        const [y, m, d] = query.fechaInicio.split('-').map(Number);
        fInicio = new Date(y, m - 1, d, 0, 0, 0, 0);
      } else {
        fInicio = new Date(query.fechaInicio);
      }
      if (!isNaN(fInicio.getTime())) {
        qb.andWhere('auditoria.fechaEvento >= :fInicio', { fInicio });
      }
    }

    if (query.fechaFin) {
      let fFin: Date;
      if (typeof query.fechaFin === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.fechaFin)) {
        const [y, m, d] = query.fechaFin.split('-').map(Number);
        fFin = new Date(y, m - 1, d, 23, 59, 59, 999);
      } else {
        fFin = new Date(query.fechaFin);
        fFin.setHours(23, 59, 59, 999);
      }
      if (!isNaN(fFin.getTime())) {
        qb.andWhere('auditoria.fechaEvento <= :fFin', { fFin });
      }
    }

    if (query.q && query.q.trim()) {
      const busqueda = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(auditoria.descripcion) LIKE :busqueda OR LOWER(auditoria.ipCliente) LIKE :busqueda OR LOWER(auditoria.clientIdentifier) LIKE :busqueda OR LOWER(auditoria.usuarioBd) LIKE :busqueda OR LOWER(auditoria.tablaAfectada) LIKE :busqueda)',
        { busqueda },
      );
    }

    qb.orderBy('auditoria.fechaEvento', 'DESC').addOrderBy('auditoria.auditoriaId', 'DESC');

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Métricas y telemetría ejecutiva de seguridad y auditoría.
   */
  async obtenerEstadisticas() {
    const totalEventosPeriodo = await this.auditoriaRepo.count();

    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const totalEventosHoy = await this.auditoriaRepo
      .createQueryBuilder('a')
      .where('a.fechaEvento >= :inicioHoy', { inicioHoy })
      .getCount();

    const operacionesCriticasCount = await this.auditoriaRepo
      .createQueryBuilder('a')
      .where(
        "a.operacion IN ('DELETE', 'AJUSTE', 'ARQUEO_FALTANTE', 'EXCEPCION_MANUAL', 'LOGIN_FALLIDO', 'AJUSTE_SALARIO')",
      )
      .getCount();

    // Desglose por módulo
    const rawModulos = await this.auditoriaRepo
      .createQueryBuilder('a')
      .select('a.modulo', 'modulo')
      .addSelect('COUNT(1)', 'total')
      .groupBy('a.modulo')
      .orderBy('COUNT(1)', 'DESC')
      .getRawMany();

    const desgloseModulos = rawModulos.map((m) => {
      const tot = Number(m.total || 0);
      return {
        modulo: m.modulo || 'SISTEMA',
        total: tot,
        porcentaje: totalEventosPeriodo > 0 ? Number(((tot / totalEventosPeriodo) * 100).toFixed(1)) : 0,
      };
    });

    // Desglose por operación
    const rawOperaciones = await this.auditoriaRepo
      .createQueryBuilder('a')
      .select('a.operacion', 'operacion')
      .addSelect('COUNT(1)', 'total')
      .groupBy('a.operacion')
      .orderBy('COUNT(1)', 'DESC')
      .getRawMany();

    const desgloseOperaciones = rawOperaciones.map((o) => ({
      operacion: o.operacion,
      total: Number(o.total || 0),
    }));

    // IPs únicas
    const rawIps = await this.auditoriaRepo
      .createQueryBuilder('a')
      .select('COUNT(DISTINCT a.ipCliente)', 'cnt')
      .getRawOne();

    const ipsUnicas = Number(rawIps?.cnt || 0);

    // Últimos 5 eventos críticos
    const ultimosEventosCriticos = await this.auditoriaRepo
      .createQueryBuilder('a')
      .where(
        "a.operacion IN ('DELETE', 'AJUSTE', 'ARQUEO_FALTANTE', 'EXCEPCION_MANUAL', 'LOGIN_FALLIDO', 'AJUSTE_SALARIO')",
      )
      .orderBy('a.fechaEvento', 'DESC')
      .take(5)
      .getMany();

    return {
      totalEventosPeriodo,
      totalEventosHoy,
      operacionesCriticas: operacionesCriticasCount,
      desgloseModulos,
      desgloseOperaciones,
      ipsUnicas,
      ultimosEventosCriticos,
    };
  }

  /**
   * Obtiene la matriz de roles y estado de credenciales de seguridad.
   */
  async obtenerRolesYUsuarios() {
    const roles = await this.rolRepo
      .createQueryBuilder('rol')
      .leftJoinAndSelect('rol.credencials', 'credencial')
      .orderBy('rol.nombre', 'ASC')
      .getMany();

    const rolesFormateados = roles.map((r) => ({
      rolId: r.rolId,
      nombre: r.nombre,
      estado: r.estado,
      descripcion: r.descripcion,
      totalUsuarios: r.credencials ? r.credencials.length : 0,
    }));

    const credenciales = await this.credencialRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.rol', 'rol')
      .leftJoinAndSelect('c.empleado', 'emp')
      .leftJoinAndSelect('emp.sucursal', 'suc')
      .leftJoinAndSelect('emp.puesto', 'puesto')
      .select([
        'c.credencialId',
        'c.username',
        'c.ultimoLogin',
        'c.fechaRegistro',
        'c.estado',
        'c.empleadoId',
        'rol.rolId',
        'rol.nombre',
        'emp.empleadoId',
        'emp.nombre',
        'emp.apellido',
        'emp.estado',
        'puesto.nombre',
        'suc.sucursalId',
        'suc.nombre',
        'suc.tipoSucursal',
      ])
      .orderBy('c.ultimoLogin', 'DESC')
      .addOrderBy('c.username', 'ASC')
      .getMany();

    return {
      roles: rolesFormateados,
      credenciales: credenciales.map((c) => ({
        credencialId: c.credencialId,
        username: c.username,
        ultimoLogin: c.ultimoLogin,
        fechaRegistro: c.fechaRegistro,
        estado: c.estado,
        rol: c.rol?.nombre || 'SIN_ROL',
        empleado: c.empleado
          ? {
              empleadoId: c.empleado.empleadoId,
              nombreCompleto: `${c.empleado.nombre} ${c.empleado.apellido}`,
              puesto: c.empleado.puesto?.nombre || 'Sin Puesto',
              sucursal: c.empleado.sucursal?.nombre || 'Sin Asignar',
            }
          : null,
      })),
    };
  }

  /**
   * Obtiene un evento específico por ID.
   */
  async obtenerEventoPorId(id: number): Promise<AuditoriaEvento> {
    const evento = await this.auditoriaRepo.findOne({
      where: { auditoriaId: id },
    });

    if (!evento) {
      throw new NotFoundException(`No se encontró el evento de auditoría #${id}.`);
    }

    return evento;
  }

  /**
   * Registra un evento de auditoría de forma segura y no bloqueante.
   */
  async registrarEvento(dto: CreateAuditoriaDto): Promise<AuditoriaEvento | null> {
    try {
      const evento = this.auditoriaRepo.create({
        operacion: dto.operacion.toUpperCase(),
        tablaAfectada: dto.tablaAfectada.toUpperCase(),
        modulo: dto.modulo ? dto.modulo.toUpperCase() : 'SISTEMA',
        registroId: dto.registroId ?? null,
        descripcion: dto.descripcion ?? null,
        usuarioBd: dto.usuarioBd || 'FARMACIA_APP',
        clientIdentifier: dto.clientIdentifier || null,
        ipCliente: dto.ipCliente || '127.0.0.1',
        host: dto.host || 'farma-client',
        fechaEvento: new Date(),
      });

      return await this.auditoriaRepo.save(evento);
    } catch (error) {
      this.logger.error(`Error al registrar evento de auditoría en ${dto.tablaAfectada}:`, error);
      return null;
    }
  }

  /**
   * Auto-siembra de eventos de auditoría históricos representativos si la tabla está vacía.
   */
  async autoSeedAuditoriaSiEstaVacia(): Promise<void> {
    const count = await this.auditoriaRepo.count();
    if (count > 0) return;

    this.logger.log('Sembrando eventos históricos de auditoría farmacéutica...');

    const ahora = Date.now();
    const unDia = 24 * 60 * 60 * 1000;
    const unaHora = 60 * 60 * 1000;

    const eventosSeed: Partial<AuditoriaEvento>[] = [
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'admin',
        modulo: 'AUTH',
        operacion: 'LOGIN',
        tablaAfectada: 'CREDENCIAL',
        registroId: 1,
        ipCliente: '192.168.1.10',
        host: 'srv-terminal-central',
        descripcion: 'Inicio de sesión exitoso en consola administrativa con rol ADMINISTRADOR.',
        fechaEvento: new Date(ahora - 12 * unDia - 3 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'admin',
        modulo: 'ACTIVOS_FIJOS',
        operacion: 'INSERT',
        tablaAfectada: 'ACTIVO_FIJO',
        registroId: 1,
        ipCliente: '192.168.1.10',
        host: 'srv-terminal-central',
        descripcion: 'Alta patrimonial de equipo médico: Refrigerador Liebherr MedLine IoT en Bodega Central (Valor Q 24,500.00).',
        fechaEvento: new Date(ahora - 11 * unDia - 5 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'farma_regente',
        modulo: 'AUTH',
        operacion: 'LOGIN',
        tablaAfectada: 'CREDENCIAL',
        registroId: 2,
        ipCliente: '192.168.2.15',
        host: 'terminal-pos-miraflores',
        descripcion: 'Inicio de sesión de Farmacéutico Regente en Stand Mall Miraflores.',
        fechaEvento: new Date(ahora - 10 * unDia - 2 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'farma_regente',
        modulo: 'CAJAS',
        operacion: 'ARQUEO',
        tablaAfectada: 'SESION_CAJA',
        registroId: 101,
        ipCliente: '192.168.2.15',
        host: 'terminal-pos-miraflores',
        descripcion: 'Apertura de turno en CAJA-01 Miraflores con fondo de sencillo Q 300.00.',
        fechaEvento: new Date(ahora - 10 * unDia - 1 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'farma_regente',
        modulo: 'INVENTARIO',
        operacion: 'INSERT',
        tablaAfectada: 'LOTE',
        registroId: 205,
        ipCliente: '192.168.1.10',
        host: 'srv-terminal-central',
        descripcion: 'Entrada de compra de Amoxicilina 500mg Lote #AMX-2026-09 (100 unidades recibidas).',
        fechaEvento: new Date(ahora - 9 * unDia - 4 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'operador_cc',
        modulo: 'PEDIDOS',
        operacion: 'INSERT',
        tablaAfectada: 'PEDIDO',
        registroId: 301,
        ipCliente: '10.0.1.45',
        host: 'callcenter-pos-03',
        descripcion: 'Creación de Pedido Telefónico #PED-1049 para entrega a domicilio en Zona 10 (Total Q 480.00).',
        fechaEvento: new Date(ahora - 8 * unDia - 6 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'operador_cc',
        modulo: 'INVENTARIO',
        operacion: 'UPDATE',
        tablaAfectada: 'INVENTARIO',
        registroId: 12,
        ipCliente: '10.0.1.45',
        host: 'callcenter-pos-03',
        descripcion: 'Descuento automático de stock aplicando protocolo FEFO (Lote #AMX-2026-09) para despacho de pedido.',
        fechaEvento: new Date(ahora - 8 * unDia - 5 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'admin',
        modulo: 'TRANSFERENCIAS',
        operacion: 'TRANSFERENCIA',
        tablaAfectada: 'TRANSFERENCIA',
        registroId: 402,
        ipCliente: '192.168.1.10',
        host: 'srv-terminal-central',
        descripcion: 'Despacho de Guía de Traslado #TRF-0012: Bodega Matriz -> Stand Gasolinera Roosevelt (50 unidades).',
        fechaEvento: new Date(ahora - 7 * unDia - 2 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'stand_roosevelt',
        modulo: 'TRANSFERENCIAS',
        operacion: 'UPDATE',
        tablaAfectada: 'TRANSFERENCIA',
        registroId: 402,
        ipCliente: '192.168.3.22',
        host: 'terminal-gas-roosevelt',
        descripcion: 'Confirmación e ingreso a bodega de Guía #TRF-0012 en Stand Gasolinera Roosevelt.',
        fechaEvento: new Date(ahora - 7 * unDia + 2 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'farma_regente',
        modulo: 'INVENTARIO',
        operacion: 'EXCEPCION_MANUAL',
        tablaAfectada: 'MOVIMIENTO_INVENTARIO',
        registroId: 504,
        ipCliente: '192.168.2.15',
        host: 'terminal-pos-miraflores',
        descripcion: 'Salida de inventario por Excepción Manual: [EXCEPCIÓN MANUAL: Frasco quebrado en estantería durante acomodo matutino].',
        fechaEvento: new Date(ahora - 6 * unDia - 3 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'cajero_noche',
        modulo: 'CAJAS',
        operacion: 'ARQUEO_FALTANTE',
        tablaAfectada: 'SESION_CAJA',
        registroId: 108,
        ipCliente: '192.168.3.22',
        host: 'terminal-gas-roosevelt',
        descripcion: 'Cierre de caja con descuadre: Faltante de Q 15.00 reportado en Stand Gasolinera Roosevelt. Justificación: Discrepancia de vuelto menor.',
        fechaEvento: new Date(ahora - 5 * unDia - 4 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'admin',
        modulo: 'PLANILLAS',
        operacion: 'INSERT',
        tablaAfectada: 'PLANILLA',
        registroId: 601,
        ipCliente: '192.168.1.10',
        host: 'srv-terminal-central',
        descripcion: 'Generación de Nómina Farmacéutica Quincenal con retención IGSS laboral 4.83% y Bonificación Ley Dto. 37-2001.',
        fechaEvento: new Date(ahora - 4 * unDia - 7 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'admin',
        modulo: 'PLANILLAS',
        operacion: 'AJUSTE_SALARIO',
        tablaAfectada: 'HISTORIAL_SALARIO',
        registroId: 701,
        ipCliente: '192.168.1.10',
        host: 'srv-terminal-central',
        descripcion: 'Ajuste salarial aplicado a Farmacéutico Regente de Q 6,500.00 a Q 7,200.00. Motivo: Ajuste por antigüedad y certificación farmacéutica.',
        fechaEvento: new Date(ahora - 3 * unDia - 1 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'hacker_attempt',
        modulo: 'AUTH',
        operacion: 'LOGIN_FALLIDO',
        tablaAfectada: 'CREDENCIAL',
        registroId: null,
        ipCliente: '185.220.101.5',
        host: 'unknown-external',
        descripcion: 'Intento de autenticación fallido para el usuario root desde dirección IP externa no reconocida.',
        fechaEvento: new Date(ahora - 2 * unDia - 8 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'admin',
        modulo: 'PLANILLAS',
        operacion: 'UPDATE',
        tablaAfectada: 'PLANILLA',
        registroId: 601,
        ipCliente: '192.168.1.10',
        host: 'srv-terminal-central',
        descripcion: 'Cierre y pago bancario definitivo de Planilla #601. Estado actualizado a PAGADA.',
        fechaEvento: new Date(ahora - 1 * unDia - 3 * unaHora),
      },
      {
        usuarioBd: 'FARMACIA_APP',
        clientIdentifier: 'admin',
        modulo: 'AUTH',
        operacion: 'LOGIN',
        tablaAfectada: 'CREDENCIAL',
        registroId: 1,
        ipCliente: '::1',
        host: 'localhost',
        descripcion: 'Inicio de sesión administrativo verificado.',
        fechaEvento: new Date(ahora - 15 * 60 * 1000), // Hace 15 min
      },
    ];

    for (const ev of eventosSeed) {
      await this.auditoriaRepo.save(this.auditoriaRepo.create(ev));
    }

    this.logger.log(`Se auto-sembraron ${eventosSeed.length} eventos históricos en AUDITORIA_EVENTO.`);
  }
}
