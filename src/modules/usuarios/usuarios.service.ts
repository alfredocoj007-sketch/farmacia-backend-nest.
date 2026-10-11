import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Credencial } from '../../database/entities/credencial.entity';
import { Empleado } from '../../database/entities/empleado.entity';
import { Rol } from '../../database/entities/rol.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Puesto } from '../../database/entities/puesto.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { QueryUsuariosDto } from './dto/query-usuarios.dto';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    @InjectRepository(Credencial)
    private readonly credencialRepo: Repository<Credencial>,

    @InjectRepository(Empleado)
    private readonly empleadoRepo: Repository<Empleado>,

    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,

    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,

    @InjectRepository(Puesto)
    private readonly puestoRepo: Repository<Puesto>,

    private readonly auditoriaService: AuditoriaService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryUsuariosDto) {
    const qb = this.credencialRepo
      .createQueryBuilder('credencial')
      .leftJoinAndSelect('credencial.empleado', 'empleado')
      .leftJoinAndSelect('credencial.rol', 'rol')
      .leftJoinAndSelect('empleado.sucursal', 'sucursal')
      .leftJoinAndSelect('empleado.puesto', 'puesto')
      .orderBy('credencial.fechaRegistro', 'DESC');

    if (query.buscar) {
      const termino = `%${query.buscar.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(credencial.username) LIKE :termino OR LOWER(empleado.nombre) LIKE :termino OR LOWER(empleado.apellido) LIKE :termino)',
        { termino },
      );
    }

    if (query.rolId) {
      qb.andWhere('rol.rolId = :rolId', { rolId: Number(query.rolId) });
    }

    if (query.sucursalId) {
      qb.andWhere('sucursal.sucursalId = :sucursalId', {
        sucursalId: Number(query.sucursalId),
      });
    }

    if (query.estado) {
      qb.andWhere('credencial.estado = :estado', {
        estado: query.estado.toUpperCase(),
      });
    }

    const data = await qb.getMany();
    return { data, total: data.length };
  }

  async findOne(id: number): Promise<Credencial> {
    const credencial = await this.credencialRepo.findOne({
      where: { credencialId: id },
      relations: {
        empleado: {
          sucursal: true,
          puesto: true,
        },
        rol: true,
      },
    });

    if (!credencial) {
      throw new NotFoundException(`No existe un usuario con ID #${id}.`);
    }

    return credencial;
  }

  async listarRoles(): Promise<Rol[]> {
    return this.rolRepo.find({
      where: { estado: 'ACTIVO' },
      order: { rolId: 'ASC' },
    });
  }

  async listarEmpleadosDisponibles(): Promise<any[]> {
    const empleados = await this.empleadoRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.puesto', 'puesto')
      .leftJoinAndSelect('e.sucursal', 'sucursal')
      .leftJoinAndSelect('e.credencial', 'credencial')
      .leftJoinAndSelect('credencial.rol', 'rol')
      .where('e.estado = :estado', { estado: 'ACTIVO' })
      .orderBy('e.nombre', 'ASC')
      .addOrderBy('e.apellido', 'ASC')
      .getMany();

    return empleados.map((e) => ({
      empleadoId: e.empleadoId,
      nombre: e.nombre,
      apellido: e.apellido,
      nombreCompleto: `${e.nombre} ${e.apellido}`.trim(),
      dpi: e.dpi,
      telefono: e.telefono,
      estado: e.estado,
      puesto: e.puesto ? { puestoId: e.puesto.puestoId, nombre: e.puesto.nombre } : null,
      sucursal: e.sucursal
        ? {
            sucursalId: e.sucursal.sucursalId,
            nombre: e.sucursal.nombre,
            tipoSucursal: e.sucursal.tipoSucursal,
          }
        : null,
      tieneUsuario: !!e.credencial,
      username: e.credencial?.username || null,
      rolNombre: e.credencial?.rol?.nombre || null,
    }));
  }

  async create(dto: CreateUsuarioDto, adminUsername = 'admin'): Promise<Credencial> {
    const usernameNormalizado = dto.username.trim().toLowerCase();

    // 1. Validar nombre de usuario único
    const existe = await this.credencialRepo.findOne({
      where: { username: usernameNormalizado },
    });
    if (existe) {
      throw new ConflictException(
        `El nombre de usuario "${usernameNormalizado}" ya está registrado.`,
      );
    }

    // 2. Validar rol y sucursal
    const rol = await this.rolRepo.findOne({
      where: { rolId: Number(dto.rolId) },
    });
    if (!rol) {
      throw new NotFoundException(`El rol con ID #${dto.rolId} no existe.`);
    }

    const sucursal = await this.sucursalRepo.findOne({
      where: { sucursalId: Number(dto.sucursalId) },
    });
    if (!sucursal) {
      throw new NotFoundException(
        `La sucursal con ID #${dto.sucursalId} no existe.`,
      );
    }

    // 3. Buscar o determinar puesto de trabajo afín
    const puestos = await this.puestoRepo.find();
    let puesto = puestos.find((p) =>
      p.nombre.toLowerCase().includes(rol.nombre.toLowerCase()),
    );
    if (!puesto && puestos.length > 0) {
      puesto = puestos[0];
    }

    // 4. Validar complejidad de contraseña segura y hashear
    this.validarPasswordSegura(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    let credencialCreadaId: number;

    // 5. Transacción atómica:
    // Si se proporciona empleadoId: vincular al colaborador existente de Planilla
    if (dto.empleadoId) {
      const empExistente = await this.empleadoRepo.findOne({
        where: { empleadoId: Number(dto.empleadoId) },
        relations: { credencial: true, sucursal: true, puesto: true },
      });
      if (!empExistente) {
        throw new NotFoundException(
          `El colaborador con ID #${dto.empleadoId} no existe en el sistema.`,
        );
      }
      if (empExistente.credencial) {
        throw new ConflictException(
          `El colaborador ${empExistente.nombre} ${empExistente.apellido} ya tiene asignada la cuenta de usuario "${empExistente.credencial.username}".`,
        );
      }

      await this.dataSource.transaction(async (manager) => {
        // Sincronizar sucursal si difiere
        if (dto.sucursalId && empExistente.sucursal?.sucursalId !== Number(dto.sucursalId)) {
          empExistente.sucursal = sucursal;
          await manager.save(empExistente);
        }
        // Actualizar teléfono si se proporcionó y el empleado no lo tenía
        if (dto.telefono && !empExistente.telefono) {
          empExistente.telefono = dto.telefono.trim();
          await manager.save(empExistente);
        }

        const nuevaCredencial = manager.create(Credencial, {
          username: usernameNormalizado,
          passwordHash,
          empleadoId: empExistente.empleadoId,
          empleado: empExistente,
          rol: rol,
          estado: 'ACTIVO',
          fechaRegistro: new Date(),
        });

        const credencialGuardada = await manager.save(nuevaCredencial);
        credencialCreadaId = credencialGuardada.credencialId;
      });
    } else {
      // Flujo de creación de colaborador nuevo desde cero
      await this.dataSource.transaction(async (manager) => {
        const nuevoEmpleado = manager.create(Empleado, {
          nombre: dto.nombre.trim(),
          apellido: dto.apellido.trim(),
          telefono: dto.telefono?.trim() || null,
          dpi: dto.dpi?.trim() || null,
          salarioActual: 3500.0,
          fechaIngreso: new Date(),
          estado: 'ACTIVO',
          sucursal: sucursal,
          puesto: puesto || undefined,
        });

        const empleadoGuardado = await manager.save(nuevoEmpleado);

        const nuevaCredencial = manager.create(Credencial, {
          username: usernameNormalizado,
          passwordHash,
          empleadoId: empleadoGuardado.empleadoId,
          empleado: empleadoGuardado,
          rol: rol,
          estado: 'ACTIVO',
          fechaRegistro: new Date(),
        });

        const credencialGuardada = await manager.save(nuevaCredencial);
        credencialCreadaId = credencialGuardada.credencialId;
      });
    }

    // 6. Auditoría
    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'USUARIOS',
        operacion: 'INSERT',
        tablaAfectada: 'CREDENCIAL',
        registroId: credencialCreadaId!,
        descripcion: `Creación de nuevo usuario: ${usernameNormalizado} (Rol: ${rol.nombre}, Sucursal: ${sucursal.nombre})`,
        usuarioBd: adminUsername,
        clientIdentifier: adminUsername,
      });
    } catch (e) {
      this.logger.warn('No se pudo registrar auditoría de creación de usuario:', e);
    }

    return this.findOne(credencialCreadaId!);
  }

  async update(
    id: number,
    dto: UpdateUsuarioDto,
    adminUsername = 'admin',
  ): Promise<Credencial> {
    const credencial = await this.findOne(id);
    const usernameNormalizado = (credencial.username || '').trim().toLowerCase();
    const esAdminPrincipal = usernameNormalizado === 'admin';

    // Regla 1: Protección absoluta del Administrador Principal ('admin')
    if (esAdminPrincipal) {
      if (dto.estado && dto.estado === 'INACTIVO') {
        throw new BadRequestException(
          'El usuario Administrador Principal (admin) no puede ser desactivado para garantizar el acceso administrativo al sistema.',
        );
      }
      if (dto.rolId !== undefined && Number(dto.rolId) !== credencial.rol?.rolId) {
        throw new BadRequestException(
          'El rol del usuario Administrador Principal (admin) es permanente y no puede ser modificado.',
        );
      }
    }

    // Regla 2: Protección del Último Administrador Activo del Sistema
    const rolActualEsAdmin = credencial.rol?.nombre?.toUpperCase() === 'ADMIN';
    const cuentaActualmenteActiva = credencial.estado === 'ACTIVO';

    if (rolActualEsAdmin && cuentaActualmenteActiva) {
      // Validación al intentar desactivar
      if (dto.estado === 'INACTIVO') {
        const adminsActivos = await this.credencialRepo
          .createQueryBuilder('c')
          .innerJoin('c.rol', 'r')
          .where('UPPER(r.nombre) = :nombreRol', { nombreRol: 'ADMIN' })
          .andWhere('c.estado = :estado', { estado: 'ACTIVO' })
          .getCount();

        if (adminsActivos <= 1) {
          throw new BadRequestException(
            'No es posible desactivar al único Administrador activo del sistema. Debe existir al menos un administrador activo para gestionar usuarios y roles.',
          );
        }
      }

      // Validación al intentar cambiar a un rol no-admin
      if (dto.rolId !== undefined && Number(dto.rolId) !== credencial.rol?.rolId) {
        const nuevoRol = await this.rolRepo.findOne({
          where: { rolId: Number(dto.rolId) },
        });
        if (!nuevoRol) {
          throw new NotFoundException(`El rol #${dto.rolId} no existe.`);
        }
        if (nuevoRol.nombre.toUpperCase() !== 'ADMIN') {
          const adminsActivos = await this.credencialRepo
            .createQueryBuilder('c')
            .innerJoin('c.rol', 'r')
            .where('UPPER(r.nombre) = :nombreRol', { nombreRol: 'ADMIN' })
            .andWhere('c.estado = :estado', { estado: 'ACTIVO' })
            .getCount();

          if (adminsActivos <= 1) {
            throw new BadRequestException(
              'No es posible cambiar el rol del único Administrador activo del sistema a un rol diferente. Debe existir al menos un administrador activo.',
            );
          }
        }
      }
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. Actualizar empleado si aplica
      const empleado = credencial.empleado;
      if (empleado) {
        if (dto.nombre) empleado.nombre = dto.nombre.trim();
        if (dto.apellido) empleado.apellido = dto.apellido.trim();
        if (dto.telefono !== undefined) empleado.telefono = dto.telefono?.trim() || null;

        if (dto.sucursalId && dto.sucursalId !== empleado.sucursal?.sucursalId) {
          const nuevaSucursal = await manager.findOne(Sucursal, {
            where: { sucursalId: Number(dto.sucursalId) },
          });
          if (!nuevaSucursal) {
            throw new NotFoundException(`La sucursal #${dto.sucursalId} no existe.`);
          }
          empleado.sucursal = nuevaSucursal;
        }

        if (dto.estado) {
          empleado.estado = dto.estado;
        }

        await manager.save(empleado);
      }

      // 2. Actualizar credencial
      if (dto.rolId && dto.rolId !== credencial.rol?.rolId) {
        const nuevoRol = await manager.findOne(Rol, {
          where: { rolId: Number(dto.rolId) },
        });
        if (!nuevoRol) {
          throw new NotFoundException(`El rol #${dto.rolId} no existe.`);
        }
        credencial.rol = nuevoRol;
      }

      if (dto.estado) {
        credencial.estado = dto.estado;
      }

      if (dto.password && dto.password.trim().length > 0) {
        this.validarPasswordSegura(dto.password.trim());
        credencial.passwordHash = await bcrypt.hash(dto.password.trim(), 10);
      }

      await manager.save(credencial);
    });

    // 3. Auditoría
    try {
      await this.auditoriaService.registrarEvento({
        modulo: 'USUARIOS',
        operacion: 'UPDATE',
        tablaAfectada: 'CREDENCIAL',
        registroId: id,
        descripcion: `Actualización de usuario: ${credencial.username} (Estado: ${dto.estado || credencial.estado})`,
        usuarioBd: adminUsername,
        clientIdentifier: adminUsername,
      });
    } catch (e) {
      this.logger.warn('No se pudo registrar auditoría de actualización de usuario:', e);
    }

    return this.findOne(id);
  }

  async cambiarEstado(
    id: number,
    nuevoEstado: 'ACTIVO' | 'INACTIVO',
    adminUsername = 'admin',
  ): Promise<Credencial> {
    if (nuevoEstado !== 'ACTIVO' && nuevoEstado !== 'INACTIVO') {
      throw new BadRequestException('El estado debe ser ACTIVO o INACTIVO.');
    }

    return this.update(id, { estado: nuevoEstado }, adminUsername);
  }

  private validarPasswordSegura(password: string): void {
    if (!password || password.length < 8) {
      throw new BadRequestException(
        'La contraseña debe tener una longitud mínima de 8 caracteres.',
      );
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos una letra mayúscula (A-Z).',
      );
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos una letra minúscula (a-z).',
      );
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos un número (0-9).',
      );
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos un carácter especial (ej: !@#$%*).',
      );
    }
  }
}
