import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Caja } from '../../database/entities/caja.entity';
import { SesionCaja } from '../../database/entities/sesion-caja.entity';
import { MovimientoCaja } from '../../database/entities/movimiento-caja.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Empleado } from '../../database/entities/empleado.entity';
import { AbrirSesionDto } from './dto/abrir-sesion.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { CerrarSesionDto } from './dto/cerrar-sesion.dto';
import { CreateCajaDto } from './dto/create-caja.dto';

import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class CajasService {
  private readonly logger = new Logger(CajasService.name);

  constructor(
    @InjectRepository(Caja)
    private readonly cajaRepo: Repository<Caja>,
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepo: Repository<SesionCaja>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoCajaRepo: Repository<MovimientoCaja>,
    @InjectRepository(MetodoPago)
    private readonly metodoPagoRepo: Repository<MetodoPago>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
    @InjectRepository(Empleado)
    private readonly empleadoRepo: Repository<Empleado>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Lista las cajas de una sucursal con el estado de su sesión actual.
   * Si la sucursal no tiene ninguna caja registrada, autogenera la 'CAJA-01' para operar de inmediato.
   */
  async listarCajasPorSucursal(sucursalId: number) {
    let cajas = await this.cajaRepo.find({
      where: { sucursalId, estado: 'ACTIVA' },
      order: { codigoCaja: 'ASC' },
    });

    if (cajas.length === 0) {
      const sucursal = await this.sucursalRepo.findOne({ where: { sucursalId } });
      if (sucursal) {
        const nuevaCaja = this.cajaRepo.create({
          sucursalId,
          codigoCaja: `CAJA-01`,
          descripcion: `Terminal principal de mostrador (${sucursal.nombre})`,
          estado: 'ACTIVA',
        });
        await this.cajaRepo.save(nuevaCaja);
        cajas = [nuevaCaja];
      }
    }

    // Enriquecer cada caja con su sesión activa si la tiene
    const resultado = await Promise.all(
      cajas.map(async (caja) => {
        const sesionActiva = await this.sesionCajaRepo.findOne({
          where: { caja: { cajaId: caja.cajaId }, estado: 'ABIERTA' },
          relations: {
            empleadoApertura: true,
            movimientoCajas: true,
          },
          order: { fechaApertura: 'DESC' },
        });

        let ultimoMovimiento: {
          fecha: Date;
          descripcion: string;
          monto: number;
          tipo: string;
        } | null = null;

        if (sesionActiva?.movimientoCajas && sesionActiva.movimientoCajas.length > 0) {
          const ordenados = [...sesionActiva.movimientoCajas].sort(
            (a, b) => new Date(b.fechaMovimiento).getTime() - new Date(a.fechaMovimiento).getTime(),
          );
          const ult = ordenados[0];
          ultimoMovimiento = {
            fecha: ult.fechaMovimiento,
            descripcion: ult.descripcion || '',
            monto: Number(ult.monto),
            tipo: ult.tipoMovimiento,
          };
        }

        return {
          ...caja,
          sesionActiva: sesionActiva
            ? {
                sesionCajaId: sesionActiva.sesionCajaId,
                saldoInicial: Number(sesionActiva.saldoInicial),
                totalIngresos: Number(sesionActiva.totalIngresos),
                totalEgresos: Number(sesionActiva.totalEgresos),
                fechaApertura: sesionActiva.fechaApertura,
                cajeroNombre: `${sesionActiva.empleadoApertura?.nombre ?? ''} ${sesionActiva.empleadoApertura?.apellido ?? ''}`.trim(),
                ultimoMovimiento,
              }
            : null,
        };
      }),
    );

    return resultado;
  }

  /**
   * Obtiene la sesión activa de una caja con el desglose de movimientos y métodos de pago.
   */
  async obtenerSesionActiva(cajaId: number) {
    const sesion = await this.sesionCajaRepo.findOne({
      where: { caja: { cajaId }, estado: 'ABIERTA' },
      relations: {
        caja: { sucursal: true },
        empleadoApertura: true,
        movimientoCajas: {
          metodoPago: true,
          empleado: true,
        },
      },
      order: { fechaApertura: 'DESC' },
    });

    if (!sesion) {
      return null;
    }

    // Desglose de ingresos y egresos por método de pago
    let ingresosEfectivo = 0;
    let ingresosTarjeta = 0;
    let ingresosTransferencia = 0;
    let ingresosOtros = 0;
    let egresosEfectivo = 0;

    for (const m of sesion.movimientoCajas || []) {
      const nombreMetodo = (m.metodoPago?.nombre || '').toUpperCase();
      const monto = Number(m.monto);

      if (m.tipoMovimiento === 'INGRESO') {
        if (nombreMetodo.includes('EFECTIVO')) {
          ingresosEfectivo += monto;
        } else if (nombreMetodo.includes('TARJETA')) {
          ingresosTarjeta += monto;
        } else if (nombreMetodo.includes('TRANSFERENCIA')) {
          ingresosTransferencia += monto;
        } else {
          ingresosOtros += monto;
        }
      } else if (m.tipoMovimiento === 'EGRESO') {
        egresosEfectivo += monto;
      }
    }

    const saldoInicial = Number(sesion.saldoInicial);
    const efectivoEsperado = saldoInicial + ingresosEfectivo - egresosEfectivo;
    const saldoTotalSistema = saldoInicial + Number(sesion.totalIngresos) - Number(sesion.totalEgresos);

    return {
      sesionCajaId: sesion.sesionCajaId,
      cajaId: sesion.caja.cajaId,
      codigoCaja: sesion.caja.codigoCaja,
      sucursalNombre: sesion.caja.sucursal?.nombre,
      estado: sesion.estado,
      saldoInicial,
      totalIngresos: Number(sesion.totalIngresos),
      totalEgresos: Number(sesion.totalEgresos),
      saldoTotalSistema,
      efectivoEsperado,
      desglose: {
        ingresosEfectivo,
        ingresosTarjeta,
        ingresosTransferencia,
        ingresosOtros,
        egresosEfectivo,
      },
      fechaApertura: sesion.fechaApertura,
      cajeroApertura: `${sesion.empleadoApertura?.nombre ?? ''} ${sesion.empleadoApertura?.apellido ?? ''}`.trim(),
      movimientos: (sesion.movimientoCajas || [])
        .sort((a, b) => new Date(b.fechaMovimiento).getTime() - new Date(a.fechaMovimiento).getTime())
        .map((m) => ({
          movimientoCajaId: m.movimientoCajaId,
          tipoMovimiento: m.tipoMovimiento,
          monto: Number(m.monto),
          descripcion: m.descripcion,
          fechaMovimiento: m.fechaMovimiento,
          metodoPago: m.metodoPago?.nombre,
          cajero: `${m.empleado?.nombre ?? ''} ${m.empleado?.apellido ?? ''}`.trim(),
        })),
    };
  }

  /**
   * Abre un turno de caja registrando el fondo inicial de sencillo.
   */
  async abrirSesion(dto: AbrirSesionDto, empleadoId: number) {
    const caja = await this.cajaRepo.findOne({
      where: { cajaId: dto.cajaId, estado: 'ACTIVA' },
    });
    if (!caja) {
      throw new NotFoundException(`Caja #${dto.cajaId} no encontrada o inactiva.`);
    }

    const sesionAbierta = await this.sesionCajaRepo.findOne({
      where: { caja: { cajaId: dto.cajaId }, estado: 'ABIERTA' },
    });
    if (sesionAbierta) {
      throw new BadRequestException(`La caja ${caja.codigoCaja} ya tiene una sesión abierta en curso.`);
    }

    const empleado = await this.empleadoRepo.findOne({ where: { empleadoId } });
    if (!empleado) {
      throw new NotFoundException(`Empleado #${empleadoId} no encontrado.`);
    }

    const nuevaSesion = this.sesionCajaRepo.create({
      caja,
      empleadoApertura: empleado,
      saldoInicial: dto.saldoInicial,
      totalIngresos: 0,
      totalEgresos: 0,
      estado: 'ABIERTA',
      fechaApertura: new Date(),
    });

    const sesionGuardada = await this.sesionCajaRepo.save(nuevaSesion);
    this.logger.log(`Turno de caja abierto: Sesión #${sesionGuardada.sesionCajaId} por ${empleado.nombre}`);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'CAJAS',
        operacion: 'ARQUEO',
        tablaAfectada: 'SESION_CAJA',
        registroId: sesionGuardada.sesionCajaId,
        descripcion: `Apertura de turno en ${caja.codigoCaja} (${caja.sucursal?.nombre || 'Sucursal'}) con fondo inicial de Q${dto.saldoInicial}. Cajero: ${empleado.nombre} ${empleado.apellido || ''}.`.trim(),
        clientIdentifier: empleado.nombre,
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return sesionGuardada;
  }

  /**
   * Registra un movimiento (Ingreso o Egreso) en la sesión activa.
   */
  async registrarMovimiento(dto: RegistrarMovimientoDto, empleadoId: number) {
    const sesion = await this.sesionCajaRepo.findOne({
      where: { sesionCajaId: dto.sesionCajaId, estado: 'ABIERTA' },
    });
    if (!sesion) {
      throw new BadRequestException(`La sesión #${dto.sesionCajaId} no está abierta para registrar movimientos.`);
    }

    const metodoPago = await this.metodoPagoRepo.findOne({
      where: { metodoPagoId: dto.metodoPagoId, estado: 'ACTIVO' },
    });
    if (!metodoPago) {
      throw new NotFoundException(`Método de pago #${dto.metodoPagoId} no válido.`);
    }

    const empleado = await this.empleadoRepo.findOne({ where: { empleadoId } });
    if (!empleado) {
      throw new NotFoundException(`Empleado #${empleadoId} no encontrado.`);
    }

    const movimiento = this.movimientoCajaRepo.create({
      sesionCaja: sesion,
      empleado,
      metodoPago,
      tipoMovimiento: dto.tipoMovimiento,
      monto: dto.monto,
      descripcion: dto.descripcion,
      referenciaTipo: dto.referenciaTipo || null,
      referenciaId: dto.referenciaId || null,
      fechaMovimiento: new Date(),
    });

    const movGuardado = await this.movimientoCajaRepo.save(movimiento);

    // Actualizar acumulados de la sesión
    if (dto.tipoMovimiento === 'INGRESO') {
      sesion.totalIngresos = Number(sesion.totalIngresos) + Number(dto.monto);
    } else {
      sesion.totalEgresos = Number(sesion.totalEgresos) + Number(dto.monto);
    }
    await this.sesionCajaRepo.save(sesion);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'CAJAS',
        operacion: 'ARQUEO',
        tablaAfectada: 'MOVIMIENTO_CAJA',
        registroId: movGuardado.movimientoCajaId,
        descripcion: `Movimiento de caja [${dto.tipoMovimiento}] por Q${dto.monto} (${metodoPago.nombre}) en turno #${sesion.sesionCajaId}. Motivo: ${dto.descripcion || 'Sin concepto'}.`,
        clientIdentifier: empleado.nombre,
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return movGuardado;
  }

  /**
   * Realiza el arqueo ciego/guiado y cierra el turno de caja.
   */
  async cerrarYArquearSesion(dto: CerrarSesionDto, empleadoId: number) {
    const sesion = await this.sesionCajaRepo.findOne({
      where: { sesionCajaId: dto.sesionCajaId, estado: 'ABIERTA' },
      relations: {
        caja: { sucursal: true },
        empleadoApertura: true,
        movimientoCajas: {
          metodoPago: true,
        },
      },
    });

    if (!sesion) {
      throw new BadRequestException(`La sesión #${dto.sesionCajaId} no está abierta o ya fue cerrada.`);
    }

    const empleadoCierre = await this.empleadoRepo.findOne({ where: { empleadoId } });
    if (!empleadoCierre) {
      throw new NotFoundException(`Empleado #${empleadoId} no encontrado.`);
    }

    // Calcular el efectivo teórico esperado en caja
    let ingresosEfectivo = 0;
    let egresosEfectivo = 0;

    for (const m of sesion.movimientoCajas || []) {
      const nombre = (m.metodoPago?.nombre || '').toUpperCase();
      const monto = Number(m.monto);
      if (m.tipoMovimiento === 'INGRESO' && nombre.includes('EFECTIVO')) {
        ingresosEfectivo += monto;
      } else if (m.tipoMovimiento === 'EGRESO') {
        egresosEfectivo += monto;
      }
    }

    const saldoInicial = Number(sesion.saldoInicial);
    const efectivoEsperado = Number((saldoInicial + ingresosEfectivo - egresosEfectivo).toFixed(2));
    const efectivoContado = Number(Number(dto.efectivoContado).toFixed(2));
    const diferencia = Number((efectivoContado - efectivoEsperado).toFixed(2));

    sesion.efectivoEsperado = efectivoEsperado;
    sesion.efectivoContado = efectivoContado;
    sesion.diferencia = diferencia;
    sesion.estado = 'CERRADA';
    sesion.fechaCierre = new Date();
    sesion.empleadoCierre = empleadoCierre;
    sesion.observacionCierre = dto.observacionCierre || null;

    const sesionCerrada = await this.sesionCajaRepo.save(sesion);

    this.logger.log(
      `Sesión #${sesion.sesionCajaId} CERRADA por ${empleadoCierre.nombre}. Esperado: Q${efectivoEsperado}, Contado: Q${efectivoContado}, Diferencia: Q${diferencia}`,
    );

    const resultadoArqueo = diferencia === 0 ? 'CUADRADA' : diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
    const esCritico = diferencia < 0;

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'CAJAS',
        operacion: esCritico ? 'ARQUEO_FALTANTE' : 'ARQUEO',
        tablaAfectada: 'SESION_CAJA',
        registroId: sesionCerrada.sesionCajaId,
        descripcion: `Cierre de turno y corte en ${sesion.caja?.codigoCaja || 'Caja'}: Esperado Q${efectivoEsperado}, Contado Q${efectivoContado}, Descuadre Q${diferencia} (${resultadoArqueo}). Cajero cierre: ${empleadoCierre.nombre}. ${dto.observacionCierre ? 'Obs: ' + dto.observacionCierre : ''}`.trim(),
        clientIdentifier: empleadoCierre.nombre,
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return {
      sesionCajaId: sesionCerrada.sesionCajaId,
      estado: sesionCerrada.estado,
      saldoInicial,
      totalIngresos: Number(sesionCerrada.totalIngresos),
      totalEgresos: Number(sesionCerrada.totalEgresos),
      efectivoEsperado,
      efectivoContado,
      diferencia,
      resultadoArqueo,
      observacionCierre: sesionCerrada.observacionCierre,
      fechaCierre: sesionCerrada.fechaCierre,
    };
  }

  /**
   * Catálogo de Métodos de Pago disponibles.
   * Si no existen en la base de datos, inicializa los valores estándar de farmacia.
   */
  async listarMetodosPago() {
    let metodos = await this.metodoPagoRepo.find({
      where: { estado: 'ACTIVO' },
      order: { metodoPagoId: 'ASC' },
    });

    if (metodos.length === 0) {
      const defaults = ['EFECTIVO', 'TARJETA DE DÉBITO / CRÉDITO', 'TRANSFERENCIA BANCARIA'];
      for (const nombre of defaults) {
        const nuevo = this.metodoPagoRepo.create({ nombre, estado: 'ACTIVO' });
        await this.metodoPagoRepo.save(nuevo);
      }
      metodos = await this.metodoPagoRepo.find({ where: { estado: 'ACTIVO' } });
    }

    return metodos;
  }

  /**
   * Historial de auditoría de sesiones para una caja.
   */
  async obtenerHistorialSesiones(cajaId: number, limit = 15) {
    const sesiones = await this.sesionCajaRepo.find({
      where: { caja: { cajaId } },
      relations: {
        empleadoApertura: true,
        empleadoCierre: true,
      },
      order: { fechaApertura: 'DESC' },
      take: limit,
    });

    return sesiones.map((s) => ({
      sesionCajaId: s.sesionCajaId,
      estado: s.estado,
      saldoInicial: Number(s.saldoInicial),
      totalIngresos: Number(s.totalIngresos),
      totalEgresos: Number(s.totalEgresos),
      efectivoEsperado: s.efectivoEsperado !== null ? Number(s.efectivoEsperado) : null,
      efectivoContado: s.efectivoContado !== null ? Number(s.efectivoContado) : null,
      diferencia: s.diferencia !== null ? Number(s.diferencia) : null,
      fechaApertura: s.fechaApertura,
      fechaCierre: s.fechaCierre,
      cajeroApertura: `${s.empleadoApertura?.nombre ?? ''} ${s.empleadoApertura?.apellido ?? ''}`.trim(),
      cajeroCierre: s.empleadoCierre ? `${s.empleadoCierre.nombre} ${s.empleadoCierre.apellido}`.trim() : null,
      observacionCierre: s.observacionCierre,
    }));
  }

  /**
   * Permite dar de alta una nueva caja o terminal en una farmacia.
   */
  async crearCaja(dto: CreateCajaDto) {
    const sucursal = await this.sucursalRepo.findOne({ where: { sucursalId: dto.sucursalId } });
    if (!sucursal) {
      throw new NotFoundException(`Sucursal #${dto.sucursalId} no encontrada.`);
    }

    const existe = await this.cajaRepo.findOne({
      where: { sucursalId: dto.sucursalId, codigoCaja: dto.codigoCaja },
    });
    if (existe) {
      throw new BadRequestException(`Ya existe una caja con el código ${dto.codigoCaja} en esta sucursal.`);
    }

    const nueva = this.cajaRepo.create({
      sucursalId: dto.sucursalId,
      codigoCaja: dto.codigoCaja.trim().toUpperCase(),
      descripcion: dto.descripcion?.trim() || null,
      estado: 'ACTIVA',
    });

    const guardada = await this.cajaRepo.save(nueva);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'CAJAS',
        operacion: 'INSERT',
        tablaAfectada: 'CAJA',
        registroId: guardada.cajaId,
        descripcion: `Creación de terminal de cobro: "${guardada.codigoCaja}" en sucursal ${sucursal.nombre}.`,
        clientIdentifier: 'admin',
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return guardada;
  }
}
