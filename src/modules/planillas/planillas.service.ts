import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empleado } from '../../database/entities/empleado.entity';
import { Puesto } from '../../database/entities/puesto.entity';
import { Planilla } from '../../database/entities/planilla.entity';
import { PlanillaDetalle } from '../../database/entities/planilla-detalle.entity';
import { HistorialSalario } from '../../database/entities/historial-salario.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { AjustarSalarioDto } from './dto/ajustar-salario.dto';
import { CreatePlanillaDto } from './dto/create-planilla.dto';
import { UpdatePlanillaDetalleDto } from './dto/update-planilla-detalle.dto';
import { QueryEmpleadosDto } from './dto/query-empleados.dto';
import { PagarPlanillaDto } from './dto/pagar-planilla.dto';

// Tasa legal de retención del IGSS laboral en Guatemala: 4.83%
const TASA_IGSS_LABORAL = 0.0483;
// Bonificación Incentivo legal Decreto 37-2001: Q 250.00
const BONIFICACION_LEY_DTO_37_2001 = 250.0;

import { BoletasPdfService } from './boletas-pdf.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class PlanillasService {
  private readonly logger = new Logger(PlanillasService.name);

  constructor(
    @InjectRepository(Empleado)
    private readonly empleadoRepo: Repository<Empleado>,

    @InjectRepository(Puesto)
    private readonly puestoRepo: Repository<Puesto>,

    @InjectRepository(Planilla)
    private readonly planillaRepo: Repository<Planilla>,

    @InjectRepository(PlanillaDetalle)
    private readonly detalleRepo: Repository<PlanillaDetalle>,

    @InjectRepository(HistorialSalario)
    private readonly historialSalarioRepo: Repository<HistorialSalario>,

    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,

    private readonly boletasPdfService: BoletasPdfService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Auto-siembra puestos si la tabla está vacía.
   */
  async autoSeedPuestosSiVacio(): Promise<void> {
    const conteo = await this.puestoRepo.count();
    if (conteo === 0) {
      const puestosBase = [
        { nombre: 'Farmacéutico Regente', descripcion: 'Responsable técnico sanitario y custodia de estupefacientes' },
        { nombre: 'Vendedor de Mostrador', descripcion: 'Atención al público, dispensación y cobro' },
        { nombre: 'Operador de Call Center', descripcion: 'Recepción telefónica y enrutamiento de pedidos' },
        { nombre: 'Encargado de Stand Satélite', descripcion: 'Gestión operativa de stands en centros comerciales o gasolineras' },
        { nombre: 'Administrador de Farmacia', descripcion: 'Supervisión contable, arqueos y control de personal' },
      ];

      for (const p of puestosBase) {
        await this.puestoRepo.save(this.puestoRepo.create(p));
      }
      this.logger.log('Puestos farmacéuticos inicializados correctamente.');
    }
  }

  /**
   * Auto-siembra empleados de demostración si hay pocos registros.
   */
  async autoSeedEmpleadosSiVacio(): Promise<void> {
    await this.autoSeedPuestosSiVacio();
    const conteo = await this.empleadoRepo.count();

    if (conteo < 4) {
      const puestos = await this.puestoRepo.find();
      const sucursales = await this.sucursalRepo.find();

      if (puestos.length > 0 && sucursales.length > 0) {
        const puestoFarmaceutico = puestos.find((p) => p.nombre.includes('Farmacéutico')) || puestos[0];
        const puestoStand = puestos.find((p) => p.nombre.includes('Stand')) || puestos[0];
        const puestoCallCenter = puestos.find((p) => p.nombre.includes('Call Center')) || puestos[0];

        const sucursalCentral = sucursales[0];
        const sucursalStand = sucursales.length > 1 ? sucursales[1] : sucursales[0];

        const empleadosNuevos = [
          {
            nombre: 'Licda. Sofia',
            apellido: 'Mazariegos',
            dpi: '2981045610101',
            telefono: '5544-2211',
            salarioActual: 6500,
            fechaIngreso: new Date('2024-01-15'),
            estado: 'ACTIVO',
            puesto: puestoFarmaceutico,
            sucursal: sucursalCentral,
          },
          {
            nombre: 'Carlos',
            apellido: 'Enriquez',
            dpi: '1872039480101',
            telefono: '4433-8899',
            salarioActual: 3600,
            fechaIngreso: new Date('2024-03-01'),
            estado: 'ACTIVO',
            puesto: puestoStand,
            sucursal: sucursalStand,
          },
          {
            nombre: 'Andrea',
            apellido: 'Morales',
            dpi: '3049182740101',
            telefono: '5122-3344',
            salarioActual: 3800,
            fechaIngreso: new Date('2024-05-10'),
            estado: 'ACTIVO',
            puesto: puestoCallCenter,
            sucursal: sucursalCentral,
          },
        ];

        for (const empData of empleadosNuevos) {
          const emp = await this.empleadoRepo.save(this.empleadoRepo.create(empData));
          await this.historialSalarioRepo.save(
            this.historialSalarioRepo.create({
              empleado: emp,
              salarioAnterior: null,
              salarioNuevo: emp.salarioActual,
              motivo: 'Contratación Inicial de Personal Farmacéutico',
              fechaCambio: emp.fechaIngreso,
            }),
          );
        }
        this.logger.log('Empleados de demostración sembrados con éxito.');
      }
    }
  }

  // ==========================================
  // PUESTOS
  // ==========================================

  async listarPuestos() {
    await this.autoSeedPuestosSiVacio();
    return this.puestoRepo.find({ order: { nombre: 'ASC' } });
  }

  // ==========================================
  // EMPLEADOS
  // ==========================================

  async listarEmpleados(dto: QueryEmpleadosDto = {}) {
    await this.autoSeedEmpleadosSiVacio();

    const qb = this.empleadoRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.puesto', 'puesto')
      .leftJoinAndSelect('e.sucursal', 'sucursal')
      .orderBy('e.apellido', 'ASC')
      .addOrderBy('e.nombre', 'ASC');

    if (dto.sucursalId) {
      qb.andWhere('e.sucursal.sucursalId = :sucId', { sucId: dto.sucursalId });
    }
    if (dto.puestoId) {
      qb.andWhere('e.puesto.puestoId = :puestoId', { puestoId: dto.puestoId });
    }
    if (dto.estado) {
      qb.andWhere('e.estado = :estado', { estado: dto.estado });
    }
    if (dto.busqueda && dto.busqueda.trim()) {
      const t = `%${dto.busqueda.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(e.nombre) LIKE :t OR LOWER(e.apellido) LIKE :t OR e.dpi LIKE :t)',
        { t },
      );
    }

    const items = await qb.getMany();
    return items.map((e) => ({
      empleadoId: e.empleadoId,
      nombre: e.nombre,
      apellido: e.apellido,
      nombreCompleto: `${e.nombre} ${e.apellido}`.trim(),
      dpi: e.dpi,
      telefono: e.telefono,
      fechaIngreso: e.fechaIngreso,
      salarioActual: Number(e.salarioActual),
      estado: e.estado,
      puesto: e.puesto ? { puestoId: e.puesto.puestoId, nombre: e.puesto.nombre } : null,
      sucursal: e.sucursal
        ? {
            sucursalId: e.sucursal.sucursalId,
            nombre: e.sucursal.nombre,
            tipoSucursal: e.sucursal.tipoSucursal,
          }
        : null,
    }));
  }

  async obtenerEmpleadoPorId(id: number) {
    const e = await this.empleadoRepo.findOne({
      where: { empleadoId: id },
      relations: {
        puesto: true,
        sucursal: true,
        historialSalarios: true,
      },
    });

    if (!e) {
      throw new NotFoundException(`Empleado #${id} no encontrado.`);
    }

    const historial = (e.historialSalarios || []).sort(
      (a, b) => new Date(b.fechaCambio).getTime() - new Date(a.fechaCambio).getTime(),
    );

    return {
      empleadoId: e.empleadoId,
      nombre: e.nombre,
      apellido: e.apellido,
      nombreCompleto: `${e.nombre} ${e.apellido}`.trim(),
      dpi: e.dpi,
      telefono: e.telefono,
      fechaIngreso: e.fechaIngreso,
      salarioActual: Number(e.salarioActual),
      estado: e.estado,
      puesto: e.puesto,
      sucursal: e.sucursal,
      historialSalarios: historial.map((h) => ({
        historialSalarioId: h.historialSalarioId,
        salarioAnterior: h.salarioAnterior ? Number(h.salarioAnterior) : null,
        salarioNuevo: Number(h.salarioNuevo),
        motivo: h.motivo,
        fechaCambio: h.fechaCambio,
      })),
    };
  }

  async crearEmpleado(dto: CreateEmpleadoDto) {
    if (!dto.fechaIngreso) {
      throw new BadRequestException('La fecha de ingreso es obligatoria para efectos de auditoría.');
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaIngresoDate = new Date(dto.fechaIngreso + 'T00:00:00');
    if (isNaN(fechaIngresoDate.getTime())) {
      throw new BadRequestException('La fecha de ingreso debe ser una fecha válida (YYYY-MM-DD).');
    }

    if (fechaIngresoDate < hoy) {
      throw new BadRequestException(
        'Por normas de auditoría y prevención de fraude en nómina, la fecha de ingreso no puede ser anterior a la fecha de hoy.',
      );
    }

    if (dto.dpi) {
      const existeDpi = await this.empleadoRepo.findOne({ where: { dpi: dto.dpi } });
      if (existeDpi) {
        throw new BadRequestException(`El DPI ${dto.dpi} ya está registrado para otro empleado.`);
      }
    }

    const puesto = await this.puestoRepo.findOne({ where: { puestoId: dto.puestoId } });
    if (!puesto) {
      throw new NotFoundException(`Puesto #${dto.puestoId} no encontrado.`);
    }

    const sucursal = await this.sucursalRepo.findOne({ where: { sucursalId: dto.sucursalId } });
    if (!sucursal) {
      throw new NotFoundException(`Sucursal #${dto.sucursalId} no encontrada.`);
    }

    const nuevoEmp = this.empleadoRepo.create({
      nombre: dto.nombre.trim(),
      apellido: dto.apellido.trim(),
      dpi: dto.dpi?.trim() || null,
      telefono: dto.telefono?.trim() || null,
      fechaIngreso: new Date(dto.fechaIngreso),
      salarioActual: Number(dto.salarioActual),
      estado: 'ACTIVO',
      puesto,
      sucursal,
    });

    const guardado = await this.empleadoRepo.save(nuevoEmp);

    // Registro inicial en historial
    await this.historialSalarioRepo.save(
      this.historialSalarioRepo.create({
        empleado: guardado,
        salarioAnterior: null,
        salarioNuevo: guardado.salarioActual,
        motivo: 'Alta Inicial de Contrato Laboral',
        fechaCambio: new Date(),
      }),
    );

    this.logger.log(`Empleado creado #${guardado.empleadoId}: ${guardado.nombre} ${guardado.apellido}`);
    const resEmp = await this.obtenerEmpleadoPorId(guardado.empleadoId);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'PLANILLAS',
        operacion: 'INSERT',
        tablaAfectada: 'EMPLEADO',
        registroId: guardado.empleadoId,
        descripcion: `Alta de nuevo colaborador: "${guardado.nombre} ${guardado.apellido}" (DPI: ${guardado.dpi}, Puesto: ${guardado.puesto?.nombre || 'General'}, Salario: Q${guardado.salarioActual}).`,
        clientIdentifier: 'admin',
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return resEmp;
  }

  async actualizarEmpleado(id: number, dto: UpdateEmpleadoDto) {
    const emp = await this.empleadoRepo.findOne({ where: { empleadoId: id } });
    if (!emp) {
      throw new NotFoundException(`Empleado #${id} no encontrado.`);
    }

    if (dto.dpi && dto.dpi !== emp.dpi) {
      const existeDpi = await this.empleadoRepo.findOne({ where: { dpi: dto.dpi } });
      if (existeDpi) {
        throw new BadRequestException(`El DPI ${dto.dpi} ya está registrado.`);
      }
      emp.dpi = dto.dpi.trim();
    }

    if (dto.nombre) emp.nombre = dto.nombre.trim();
    if (dto.apellido) emp.apellido = dto.apellido.trim();
    if (dto.telefono !== undefined) emp.telefono = dto.telefono?.trim() || null;
    if (dto.estado) emp.estado = dto.estado;

    if (dto.fechaIngreso) {
      const fechaNueva = new Date(dto.fechaIngreso).toISOString().substring(0, 10);
      const fechaActual = new Date(emp.fechaIngreso).toISOString().substring(0, 10);
      if (fechaNueva !== fechaActual) {
        throw new BadRequestException(
          'Por normas de auditoría contable y laboral, la fecha de ingreso no puede modificarse una vez registrado el colaborador.',
        );
      }
    }

    if (dto.puestoId) {
      const puesto = await this.puestoRepo.findOne({ where: { puestoId: dto.puestoId } });
      if (puesto) emp.puesto = puesto;
    }

    if (dto.sucursalId) {
      const sucursal = await this.sucursalRepo.findOne({ where: { sucursalId: dto.sucursalId } });
      if (sucursal) emp.sucursal = sucursal;
    }

    await this.empleadoRepo.save(emp);
    const resEmpAct = await this.obtenerEmpleadoPorId(id);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'PLANILLAS',
        operacion: 'UPDATE',
        tablaAfectada: 'EMPLEADO',
        registroId: id,
        descripcion: `Actualización de datos laborales del colaborador #${id} (${emp.nombre} ${emp.apellido}, Estado: ${emp.estado}).`,
        clientIdentifier: 'admin',
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return resEmpAct;
  }

  async ajustarSalario(id: number, dto: AjustarSalarioDto) {
    const emp = await this.empleadoRepo.findOne({ where: { empleadoId: id } });
    if (!emp) {
      throw new NotFoundException(`Empleado #${id} no encontrado.`);
    }

    const salarioAnterior = Number(emp.salarioActual);
    const salarioNuevo = Number(dto.nuevoSalario);

    if (salarioAnterior === salarioNuevo) {
      throw new BadRequestException('El nuevo salario no puede ser igual al salario actual.');
    }

    // Registrar en HISTORIAL_SALARIO
    await this.historialSalarioRepo.save(
      this.historialSalarioRepo.create({
        empleado: emp,
        salarioAnterior,
        salarioNuevo,
        motivo: dto.motivo.trim(),
        fechaCambio: new Date(),
      }),
    );

    // Actualizar salario actual en EMPLEADO
    emp.salarioActual = salarioNuevo;
    await this.empleadoRepo.save(emp);

    this.logger.log(`Ajuste salarial aplicado a empleado #${id}: Q ${salarioAnterior} -> Q ${salarioNuevo}`);
    const resAjuste = await this.obtenerEmpleadoPorId(id);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'PLANILLAS',
        operacion: 'AJUSTE_SALARIO',
        tablaAfectada: 'HISTORIAL_SALARIO',
        registroId: id,
        descripcion: `Ajuste salarial a colaborador #${id} (${emp.nombre} ${emp.apellido}): Q${salarioAnterior} -> Q${salarioNuevo}. Motivo: ${dto.motivo.trim()}.`,
        clientIdentifier: 'admin',
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return resAjuste;
  }

  // ==========================================
  // PLANILLAS Y LIQUIDACIÓN
  // ==========================================

  async listarPlanillas() {
    const planillas = await this.planillaRepo.find({
      relations: { planillaDetalles: true },
      order: { fechaInicio: 'DESC' },
    });

    return planillas.map((p) => ({
      planillaId: p.planillaId,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin,
      fechaPago: p.fechaPago,
      estado: p.estado,
      cuentaOrigen: p.cuentaOrigen || null,
      metodoPago: p.metodoPago || null,
      totalBruto: Number(p.totalBruto),
      totalDescuentos: Number(p.totalDescuentos),
      totalNeto: Number(p.totalNeto),
      colaboradoresCount: p.planillaDetalles?.length || 0,
    }));
  }

  async obtenerPlanillaPorId(id: number) {
    const p = await this.planillaRepo.findOne({
      where: { planillaId: id },
      relations: {
        planillaDetalles: {
          empleado: {
            puesto: true,
            sucursal: true,
          },
        },
      },
    });

    if (!p) {
      throw new NotFoundException(`Planilla #${id} no encontrada.`);
    }

    const diffMs = Math.abs(new Date(p.fechaFin).getTime() - new Date(p.fechaInicio).getTime());
    const diasCiclo = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const esQuincenal = diasCiclo <= 16;

    return {
      planillaId: p.planillaId,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin,
      fechaPago: p.fechaPago,
      estado: p.estado,
      cuentaOrigen: p.cuentaOrigen || null,
      metodoPago: p.metodoPago || null,
      esQuincenal,
      totalBruto: Number(p.totalBruto),
      totalDescuentos: Number(p.totalDescuentos),
      totalNeto: Number(p.totalNeto),
      detalles: (p.planillaDetalles || []).map((d) => ({
        planillaDetalleId: d.planillaDetalleId,
        empleadoId: d.empleadoId,
        nombreEmpleado: d.empleado ? `${d.empleado.nombre} ${d.empleado.apellido}`.trim() : '—',
        dpi: d.empleado?.dpi || '—',
        puestoNombre: d.empleado?.puesto?.nombre || '—',
        sucursalNombre: d.empleado?.sucursal?.nombre || '—',
        salarioBase: Number(d.salarioBase),
        salarioMensual: Number(d.empleado?.salarioActual || (esQuincenal ? Number(d.salarioBase) * 2 : Number(d.salarioBase))),
        bonificaciones: Number(d.bonificaciones),
        horasExtra: Number(d.horasExtra),
        descuentos: Number(d.descuentos),
        totalPagar: Number(d.totalPagar),
      })),
    };
  }

  async generarPlanilla(dto: CreatePlanillaDto) {
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);

    if (fechaFin < fechaInicio) {
      throw new BadRequestException('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }

    // 1. Obtener empleados activos
    await this.autoSeedEmpleadosSiVacio();
    const empleados = await this.empleadoRepo.find({
      where: { estado: 'ACTIVO' },
      relations: { puesto: true, sucursal: true },
    });

    if (empleados.length === 0) {
      throw new BadRequestException('No hay empleados activos para incluir en la planilla.');
    }

    // 2. Crear cabecera PLANILLA
    const nuevaPlanilla = this.planillaRepo.create({
      fechaInicio,
      fechaFin,
      fechaPago: null,
      estado: 'ABIERTA',
      totalBruto: 0,
      totalDescuentos: 0,
      totalNeto: 0,
    });
    const planillaGuardada = await this.planillaRepo.save(nuevaPlanilla);

    // 3. Crear detalles y calcular montos legales
    // Detección automática de modalidad: Quincenal (<= 16 días) vs Mensual (> 16 días)
    const diffMs = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
    const diasCiclo = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const esQuincenal = diasCiclo <= 16;

    let acumBruto = 0;
    let acumDescuentos = 0;
    let acumNeto = 0;

    for (const emp of empleados) {
      const salarioMensual = Number(emp.salarioActual);
      // Salario base del período: 50% si es quincenal, 100% si es mensual
      const salarioBase = esQuincenal ? Number((salarioMensual / 2).toFixed(2)) : salarioMensual;
      // Bonificación Incentivo legal Decreto 37-2001: Q 125.00 quincenal o Q 250.00 mensual
      const bonificaciones = esQuincenal
        ? Number((BONIFICACION_LEY_DTO_37_2001 / 2).toFixed(2))
        : BONIFICACION_LEY_DTO_37_2001;
      const horasExtra = 0;

      // Base afecta al IGSS en Guatemala: Salario Base + Horas Extra (La bonificación de ley está exenta de IGSS por mandato del Dto 37-2001)
      const baseAfectaIgss = salarioBase + horasExtra;
      const retencionIgss = Number((baseAfectaIgss * TASA_IGSS_LABORAL).toFixed(2));

      // Líquido a percibir (Neto)
      const totalPagar = Number((salarioBase + bonificaciones + horasExtra - retencionIgss).toFixed(2));

      acumBruto += (salarioBase + bonificaciones + horasExtra);
      acumDescuentos += retencionIgss;
      acumNeto += totalPagar;

      // Guardar montos fijos e históricos de ese momento
      const detalle = this.detalleRepo.create({
        planilla: planillaGuardada,
        empleado: emp,
        salarioBase,
        bonificaciones,
        horasExtra,
        descuentos: retencionIgss,
        totalPagar,
      });

      await this.detalleRepo.save(detalle);
    }

    // 4. Actualizar totales de cabecera
    planillaGuardada.totalBruto = Number(acumBruto.toFixed(2));
    planillaGuardada.totalDescuentos = Number(acumDescuentos.toFixed(2));
    planillaGuardada.totalNeto = Number(acumNeto.toFixed(2));
    await this.planillaRepo.save(planillaGuardada);

    this.logger.log(`Planilla #${planillaGuardada.planillaId} generada exitosamente con ${empleados.length} colaboradores (${esQuincenal ? 'Quincenal' : 'Mensual'}).`);
    const resPlanilla = await this.obtenerPlanillaPorId(planillaGuardada.planillaId);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'PLANILLAS',
        operacion: 'INSERT',
        tablaAfectada: 'PLANILLA',
        registroId: planillaGuardada.planillaId,
        descripcion: `Generación de nómina de sueldos #${planillaGuardada.planillaId} (${esQuincenal ? 'Quincenal' : 'Mensual'} del ${dto.fechaInicio} al ${dto.fechaFin}): ${empleados.length} colaboradores, Total Neto: Q${planillaGuardada.totalNeto}.`,
        clientIdentifier: 'admin',
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return resPlanilla;
  }

  async actualizarDetallePlanilla(
    planillaId: number,
    detalleId: number,
    dto: UpdatePlanillaDetalleDto,
  ) {
    const planilla = await this.planillaRepo.findOne({ where: { planillaId } });
    if (!planilla) {
      throw new NotFoundException(`Planilla #${planillaId} no encontrada.`);
    }
    if (planilla.estado !== 'ABIERTA') {
      throw new ForbiddenException(
        `Operación denegada (HTTP 403 Forbidden): La planilla #${planillaId} se encuentra en estado '${planilla.estado}'. Por normas de auditoría contable inmutable, una planilla PAGADA o cerrada no puede ser modificada.`,
      );
    }

    const detalle = await this.detalleRepo.findOne({
      where: { planillaDetalleId: detalleId, planillaId },
    });
    if (!detalle) {
      throw new NotFoundException(`Detalle #${detalleId} no encontrado en planilla #${planillaId}.`);
    }

    if (dto.horasExtra !== undefined) detalle.horasExtra = Number(dto.horasExtra);
    if (dto.bonificaciones !== undefined) detalle.bonificaciones = Number(dto.bonificaciones);

    // Recalcular IGSS y Líquido
    const salarioBase = Number(detalle.salarioBase);
    const horasExtra = Number(detalle.horasExtra);
    const bonificaciones = Number(detalle.bonificaciones);

    const baseAfecta = salarioBase + horasExtra;
    const retencionIgss = Number((baseAfecta * TASA_IGSS_LABORAL).toFixed(2));
    const descuentos = dto.descuentos !== undefined ? Number(dto.descuentos) : retencionIgss;

    detalle.descuentos = descuentos;
    detalle.totalPagar = Number((salarioBase + bonificaciones + horasExtra - descuentos).toFixed(2));
    await this.detalleRepo.save(detalle);

    // Recalcular cabecera
    const todosLosDetalles = await this.detalleRepo.find({ where: { planillaId } });
    let b = 0;
    let d = 0;
    let n = 0;
    for (const item of todosLosDetalles) {
      b += (Number(item.salarioBase) + Number(item.bonificaciones) + Number(item.horasExtra));
      d += Number(item.descuentos);
      n += Number(item.totalPagar);
    }
    planilla.totalBruto = Number(b.toFixed(2));
    planilla.totalDescuentos = Number(d.toFixed(2));
    planilla.totalNeto = Number(n.toFixed(2));
    await this.planillaRepo.save(planilla);

    return this.obtenerPlanillaPorId(planillaId);
  }

  async pagarPlanilla(id: number, dto?: PagarPlanillaDto) {
    const planilla = await this.planillaRepo.findOne({ where: { planillaId: id } });
    if (!planilla) {
      throw new NotFoundException(`Planilla #${id} no encontrada.`);
    }
    if (planilla.estado === 'PAGADA') {
      throw new BadRequestException('Esta planilla ya se encuentra PAGADA.');
    }

    planilla.estado = 'PAGADA';
    planilla.fechaPago = new Date();
    planilla.cuentaOrigen = dto?.cuentaOrigen?.trim() || 'Banco Industrial - Monetaria No. 004-102938-1';
    planilla.metodoPago = dto?.metodoPago?.trim() || 'TRANSFERENCIA_BANCARIA';
    await this.planillaRepo.save(planilla);

    this.logger.log(`Planilla #${id} marcada como PAGADA con fondos de: ${planilla.cuentaOrigen} (${planilla.metodoPago}).`);
    const resPagada = await this.obtenerPlanillaPorId(id);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'PLANILLAS',
        operacion: 'UPDATE',
        tablaAfectada: 'PLANILLA',
        registroId: id,
        descripcion: `Cierre y pago definitivo de nómina de sueldos #${id}. Monto pagado: Q${planilla.totalNeto}. Cuenta: ${planilla.cuentaOrigen}.`,
        clientIdentifier: 'admin',
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return resPagada;
  }

  async cancelarPlanilla(id: number) {
    const planilla = await this.planillaRepo.findOne({ where: { planillaId: id } });
    if (!planilla) {
      throw new NotFoundException(`Planilla #${id} no encontrada.`);
    }
    if (planilla.estado === 'PAGADA') {
      throw new ForbiddenException(
        'Operación denegada (HTTP 403 Forbidden): Por normas de auditoría contable inmutable, no se puede cancelar una planilla que ya fue pagada y asentada en el libro de nóminas.',
      );
    }

    planilla.estado = 'CANCELADA';
    await this.planillaRepo.save(planilla);

    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'PLANILLAS',
        operacion: 'DELETE',
        tablaAfectada: 'PLANILLA',
        registroId: id,
        descripcion: `Cancelación de nómina de sueldos #${id}.`,
        clientIdentifier: 'admin',
        usuarioBd: 'FARMACIA_APP',
      });
    } catch (e) {}

    return this.obtenerPlanillaPorId(id);
  }

  async obtenerEstadisticasNomina() {
    await this.autoSeedEmpleadosSiVacio();

    const empleados = await this.empleadoRepo.find({
      relations: { puesto: true, sucursal: true },
    });

    const totalEmpleados = empleados.length;
    const activos = empleados.filter((e) => e.estado === 'ACTIVO').length;

    let masaSalarialMensual = 0;
    let igssLaboralMensualProyectado = 0;

    for (const e of empleados) {
      if (e.estado === 'ACTIVO') {
        const s = Number(e.salarioActual);
        masaSalarialMensual += s + BONIFICACION_LEY_DTO_37_2001;
        igssLaboralMensualProyectado += Number((s * TASA_IGSS_LABORAL).toFixed(2));
      }
    }

    const planillas = await this.planillaRepo.find({ order: { fechaInicio: 'DESC' }, take: 1 });
    const ultimaPlanilla = planillas.length > 0 ? planillas[0] : null;

    return {
      totalEmpleados,
      empleadosActivos: activos,
      masaSalarialMensualProyectada: Number(masaSalarialMensual.toFixed(2)),
      igssLaboralMensualProyectado: Number(igssLaboralMensualProyectado.toFixed(2)),
      ultimaPlanilla: ultimaPlanilla
        ? {
            planillaId: ultimaPlanilla.planillaId,
            estado: ultimaPlanilla.estado,
            totalNeto: Number(ultimaPlanilla.totalNeto),
            fechaInicio: ultimaPlanilla.fechaInicio,
            fechaFin: ultimaPlanilla.fechaFin,
            fechaPago: ultimaPlanilla.fechaPago,
          }
        : null,
    };
  }

  async generarBoletasPdf(planillaId: number): Promise<Buffer> {
    const planilla = await this.obtenerPlanillaPorId(planillaId);
    return this.boletasPdfService.generarBoletasPlanillaPdf({
      planillaId: planilla.planillaId,
      fechaInicio: planilla.fechaInicio,
      fechaFin: planilla.fechaFin,
      fechaPago: planilla.fechaPago,
      estado: planilla.estado,
      cuentaOrigen: planilla.cuentaOrigen || null,
      metodoPago: planilla.metodoPago || null,
      esQuincenal: !!planilla.esQuincenal,
      detalles: planilla.detalles,
    });
  }

  async generarBoletaIndividualPdf(
    planillaId: number,
    detalleId: number,
  ): Promise<Buffer> {
    const planilla = await this.obtenerPlanillaPorId(planillaId);
    return this.boletasPdfService.generarBoletaIndividualPdf(
      {
        planillaId: planilla.planillaId,
        fechaInicio: planilla.fechaInicio,
        fechaFin: planilla.fechaFin,
        fechaPago: planilla.fechaPago,
        estado: planilla.estado,
        cuentaOrigen: planilla.cuentaOrigen || null,
        metodoPago: planilla.metodoPago || null,
        esQuincenal: !!planilla.esQuincenal,
        detalles: planilla.detalles,
      },
      detalleId,
    );
  }
}
